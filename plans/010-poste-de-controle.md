# PROMPT v11 — Le Poste de contrôle : une seule interface, zéro démo, et la preuve des apports

> À coller en entier dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`. Protocole inchangé (v6 §0) : boucle fermée, journal `plans/journal-final.md`, aucune permission demandée pour du réversible, **0 appel IA sur la réserve de Presti**, Stripe en mode test pour les tests, rien de non fini visible.
>
> Ce prompt remplace le v10 (`plans/009-centre-de-controle.md`) : même ambition, mais **une seule interface** au lieu de deux, et deux exigences nouvelles — le nettoyage total des données de démonstration, et le cloisonnement d'Alexandre.

---

## §0. ÉTAPE 0 — OBLIGATOIRE : où en est l'application ? (répondre avant d'écrire une ligne de code)

Benj a besoin de savoir si l'application est terminée. **Tu réponds d'abord, honnêtement, avec des preuves** — pas « c'est fait », mais « voici l'état, voici ce qui manque, voici ce qui bloque ».

Produis `plans/etat-application.md` et affiche-le dans la conversation, sous cette forme :

| Jalon v9 | État | Preuve | Ce qui manque |
|---|---|---|---|
| J1 — PWA (manifeste, SW, hors-ligne, invitation) | ✅ / ⏳ / ❌ | suite + capture | |
| J2 — Push web (VAPID, abonnements, envoi, purge) | | `push-e2e` 25/25 ? | |
| J3 — Capacitor Android (plugins, deep links, APK signé) | | AAB `mobile-v0.1.0` | |
| J4 — Sécurité WebView (cookie `httpOnly`, trousseau, biométrie) | | auditeur attaque | |
| J5 — Pipeline Play (test interne) | | lien testeurs | |
| J6 — iOS / Codemagic / TestFlight | | | M1, M5 |
| J7 — Fiches stores, soumission | | | M2, M8 |

Puis, en clair :
1. **Ce qui est en production et prouvé** (suite verte + une preuve réelle : capture d'appareil, notification reçue, APK installé).
2. **Ce qui est écrit mais pas prouvé** (code livré, test manquant ou non rejoué).
3. **Ce qui est derrière un drapeau baissé** et pourquoi.
4. **Ce qui est bloqué par Benj** (M1 Apple, M2 Play, M5 Codemagic, M7 téléphones, M8 nom) — avec l'effet exact de chaque blocage.
5. **Ce que tu as commencé et laissé en plan** dans le dépôt (branches, fichiers, migrations non collées).
6. **Ton estimation** du temps restant pour finir l'app, par jalon.

**Règle d'honnêteté** : si une chose n'a jamais tourné sur un vrai appareil, elle n'est pas « faite ». Si une migration n'est pas collée, ce qui en dépend n'est pas « livré ». Dis-le.

**Ensuite seulement**, tu enchaînes : d'abord finir ce qui manque à l'app **si c'est court (< 2 h) ou bloquant**, sinon tu attaques ce prompt et tu gardes le reste de l'app dans `plans/apres-demo.md` avec son chiffrage.

---

## §1. Une seule interface : le Poste de contrôle

**Ce qui ne va pas aujourd'hui** : il y a `/controle` (95 lignes) + `JarvisHub.tsx` (285 lignes, le radar « façon Jarvis ») **et** `/direction` (Aujourd'hui, Clients, Fiche, Apports, Journal, Alertes, Sécurité). Deux endroits pour la même chose. Benj n'en veut qu'**un**.

**Cible** : **le Poste de contrôle**, à l'adresse `/controle`, entièrement remodelé, qui absorbe **tout** ce qui a été construit sous `/direction`.

- Tout le travail déjà fait sous `app/direction/**` et `app/api/direction/**` est **déplacé, pas refait** : composants, routes, garde fondateur, re-confirmation, journal, registre des apports avec preuve (migration `0067`, lien `/a/<code>`, empreinte signée `httpOnly` 90 jours, `direction-apports-e2e` 27/27). Ce socle est bon : on le garde et on le range au bon endroit.
- `app/JarvisHub.tsx`, `app/HudGraph.tsx` et l'ancien `/controle` sont **supprimés** (déplacés dans `_to_delete/` si le shell refuse la suppression, et signalés à Benj).
- `/direction` → **redirection 301** vers `/controle` (aucun lien déjà partagé ne casse).
- Le nom affiché partout — sidebar, titre, aide — est **« Poste de contrôle »**.

**Remodelage de l'interface** (ce n'est pas un déménagement, c'est une refonte) :
- Colonne de navigation à gauche, dense, avec un compteur par onglet (« À faire 4 », « Messages 2 »).
- **Recherche globale ⌘K** : un artisan, un paiement, une facture, un email, un apport, une alerte — tout se trouve en trois lettres.
- Une **barre d'état** permanente en haut : service OK/dégradé/incident · encaissé du mois · MRR · coût IA vs budget · dernière synchro. Chaque valeur porte sa source et sa fraîcheur.
- Densité d'un outil de travail : tableaux triables, filtrables, sélection multiple, actions au clavier. Pas de grandes cartes décoratives, pas de radar animé, pas de dégradé inutile.
- **Mobile** : les alertes, la file « À faire » et les actions d'urgence (rembourser, suspendre, répondre) doivent tenir et fonctionner sur un téléphone. Le reste peut se réduire à des listes.
- Skills : `presti-design` (DNA nuit/corail), `emil-design-eng` et `apple-design` (finition, états, densité), `dataviz` (courbes MRR/trésorerie, une seule teinte, palette Presti).

---

## §2. LE GRAND NETTOYAGE : zéro démo, zéro donnée de test, partout

Benj l'a dit : « vire tout ce qui est test et démo, que tout soit accurate, que tout soit pro ». C'est un chantier à part entière, à faire **avant** d'ajouter des fonctions.

### 2.1 Inventaire d'abord

Écris `scripts/chasse-aux-demos.mjs` qui balaye le dépôt **et** la base de production et liste :
- toute donnée en base qui ressemble à un test : leads, conversations, devis, factures, artisans, matériaux, messages dont le contenu contient « test », « demo », « exemple », « lorem », « Julie Martin », « julie.test@ », « example.com », « bkgaebegibze », ou dont l'email est en `@example.*` ;
- tout composant d'interface qui affiche des données **fabriquées** : `Demo`, `Showcase`, `Mock`, `Fixture`, `Placeholder`, `sample`, tableaux en dur dans un `.tsx` du produit ;
- tout texte d'interface qui promet ou illustre avec du faux (chiffres inventés, faux témoignages, fausses statistiques) ;
- tout compte en base qui n'est ni un vrai artisan, ni le compte fondateur, ni le compte de relecture des stores.

Le rapport va dans `plans/demos-a-supprimer.md`, ligne par ligne, avec la décision : **supprimer** / **isoler** / **garder (raison)**.

### 2.2 Ce qui doit disparaître

- **Les données de test en production** : leads, conversations, devis, factures, messages fabriqués pendant les sprints. Purge par `scripts/purger-comptes-test.mjs` étendu. ⚠️ Une facture émise est scellée et inaltérable (`0041`, conservation 10 ans) : les factures de test ne se suppriment pas — elles doivent être **annulées par avoir** et **exclues des chiffres** du Poste de contrôle par un marqueur `est_test`, jamais par une suppression forcée. Dis-le à Benj plutôt que de contourner le verrou.
- **Les interfaces qui montrent du faux** dans le produit : toute liste, tout compteur, toute conversation d'exemple visible par un artisan ou dans le Poste de contrôle. Un écran sans données affiche un **état vide honnête** (« Aucune demande pour l'instant — votre lien de contact est prêt »), jamais une donnée fabriquée.
- **Les chiffres non sourcés** : tout nombre affiché sans provenance ni fraîcheur est supprimé ou branché sur sa vraie source.

### 2.3 Ce qui reste, et pourquoi (à ne pas supprimer par excès de zèle)

- **La séquence de démonstration de la landing** (`FeatureShowcase`, captures de `demo-captures.mjs`) : c'est du **marketing**, tourné sur le vrai produit. Elle reste, mais elle est **étiquetée dans le code** comme telle et **ne partage aucune donnée** avec le produit. Vérifie qu'aucune de ses captures n'expose de données réelles d'un artisan ou d'un prospect.
- **Le compte de relecture des stores** (`atelier-du-chene`) : Apple et Google **exigent** un compte de test fonctionnel. Il reste, mais il est marqué `est_demo = true` (migration `0068`), **exclu de tous les chiffres** du Poste de contrôle (MRR, clients, encaissé, apports), et signalé comme tel dans la liste des artisans.
- Les scripts de test (`scripts/*-e2e.mjs`) restent : ils créent et **détruisent** leurs comptes. Vérifie que chacun nettoie réellement (c'est la cause des comptes orphelins déjà rencontrés).

### 2.4 Preuve

`scripts/zero-demo-e2e.mjs`, ajouté à `tout-verifier` : aucun artisan hors fondateurs et compte store, aucun lead/devis/message marqué test, aucun composant de démonstration importé par une page du produit, aucun chiffre du Poste de contrôle qui bouge quand on exclut les comptes marqués. **Cette suite doit rester verte pour toujours** : elle est le garde-fou contre le retour du faux.

---

## §3. Les onglets du Poste de contrôle

Reprend intégralement le §2 du prompt v10 (`plans/009-centre-de-controle.md`) — il reste la référence de contenu. Rappel de la structure, avec l'état de ce qui existe :

| Onglet | Contenu | État |
|---|---|---|
| **Aujourd'hui** | bandeau d'état, file « À faire » avec l'action sur chaque ligne, chiffres sourcés, fil des 20 derniers événements | existe (`Aujourdhui.tsx`) — à remodeler |
| **Clients & abonnements** | liste des artisans (offre, statut Stripe, MRR, renouvellement, crédits, activité, **canal d'arrivée**), fiche complète, actions Stripe (changer d'offre, offrir des crédits, prolonger l'essai, rembourser, pause, suspendre, réactiver, portail), demandes d'abonnement non abouties, paiements, échecs, litiges, webhooks à rejouer, coupons | existe partiellement (`Clients.tsx`, `Fiche.tsx`) — à compléter |
| **Apports** | registre, preuve, contestation — voir §4 | existe (`Apports.tsx`, `0067`) — à étendre |
| **Messagerie** | Gmail de l'entreprise : boîte unifiée, répondre depuis le poste, assigner, lier à un artisan, règles client/prospect/système | à faire |
| **Comptabilité** | ventes (journal, PDF, exports comptable), achats (factures fournisseurs, récupération auto + dépôt manuel), **TVA** (franchise en base, seuils surveillés, projection, alerte à 80 %), **URSSAF/CFE/impôt** (échéances, montants estimés, taux paramétrables), **relevé mensuel du partenaire** (art. 4.2 du contrat, généré depuis Stripe + achats + registre), trésorerie et runway | à faire |
| **Santé** | audit récurrent, `tout-verifier`, coûts IA par fonction vs budget, plafonds modifiables sans déploiement, déploiements Vercel + rollback, sécurité, versions d'app installées | partiel (`alertes`, `securite`, `etat`) |
| **Artisans / support** | tickets, mode support (lecture seule, journalisé **et notifié à l'artisan**), suivi d'onboarding | à faire |
| **Réglages** | identité de l'entreprise, comptes connectés, rôles, drapeaux, modèles IA, plafonds, sauvegardes | à faire |

---

## §4. Vérifier qu'Alexandre amène de vrais clients

C'est une demande explicite de Benj, et le socle existe déjà (`0067`, lien `/a/<code>`, empreinte signée). Il faut le **compléter** pour qu'il réponde à la vraie question : *ce client est-il réellement venu par Alexandre ?*

### 4.1 Trois niveaux de preuve, affichés tels quels

| Niveau | Comment | Ce que ça vaut |
|---|---|---|
| **Prouvé** | l'artisan s'est inscrit après avoir suivi le lien `/a/<code>` d'Alexandre : empreinte signée `httpOnly` posée à la visite, rattachée à l'inscription par le serveur | fiable — **une preuve établie par le serveur ne peut pas être fabriquée à la main** (déjà en place) |
| **Déclaré + confirmé** | Alexandre a déclaré l'apport avec une pièce (échange, message, photo), **et** l'artisan a confirmé de son côté | acceptable |
| **Déclaré seul** | Alexandre a déclaré, pièce fournie, rien d'autre ne corrobore | à examiner par Benj |

Un apport **déclaré ne devient jamais prouvé** (déjà verrouillé). L'écran montre le niveau, la date, la pièce, et **qui a fait quoi**.

### 4.2 La confirmation par le client — la pièce qui manque

À l'onboarding, une question obligatoire et neutre : **« Comment avez-vous connu Presti ? »** — recherche Google · réseaux sociaux · bouche-à-oreille · **on m'a présenté Presti (nom de la personne)** · autre. La réponse est stockée (`artisans.origine_declaree`, migration `0068`), **non modifiable par Alexandre**, et affichée en face de chaque apport.

C'est la source indépendante : un apport déclaré par Alexandre dont le client répond « trouvé sur Google » est **signalé automatiquement**.

### 4.3 Faisceau d'indices et score de confiance

Le Poste de contrôle calcule, pour chaque apport déclaré, un **score de confiance** avec ses raisons affichées en clair (jamais un chiffre opaque) :

- **En faveur** : empreinte du lien présente · client confirme « on m'a présenté » · déclaration **avant** l'inscription · échange daté fourni · le client utilise réellement le produit (leads reçus, devis émis) · l'abonnement passe le premier renouvellement.
- **En défaveur** : déclaration après l'inscription (surtout près de la limite des 30 jours) · client qui répond « Google » ou « bouche-à-oreille » · **même IP ou même appareil** entre la déclaration et l'inscription · email jetable ou domaine improbable · **compte inactif** (0 lead, 0 devis, 0 connexion après 14 jours) · résiliation ou remboursement dans les 60 jours · plusieurs inscriptions rapprochées depuis la même IP · SIRET absent ou invalide (un vrai artisan a un SIRET — contrôle de clé).

Chaque signal est **factuel et vérifiable**, jamais une supposition. Le score sert à **trier une file de revue**, pas à décider seul : Benj tranche, et sa décision est journalisée.

### 4.4 La file de revue et la contestation

- Onglet Apports → **trois files** : « À valider » (déclarés, non revus), « Signalés » (score bas, raisons listées), « Validés ».
- Boutons : **Valider** (l'apport compte, commission due), **Contester** (la règle du contrat s'applique : 10 % au lieu de 20 %, motif obligatoire — déjà en place), **Refuser** (motif obligatoire, notifié à Alexandre).
- Toute décision est **journalisée** avec l'avant/après et visible par les deux.
- **Reprise sur remboursement** : si un Client apporté est remboursé ou fait un impayé, la commission correspondante est **automatiquement déduite** du relevé suivant (article 5.4 du contrat) — le calcul est fait par le système, pas à la main.

### 4.5 L'économie protège déjà

À noter dans la documentation, parce que ça rassure : créer de faux clients est **perdant** pour Alexandre (20 % de commission sur un abonnement à 29 € rapporte 5,80 €, l'abonnement en coûte 29). Le vrai risque n'est pas la fraude massive mais **l'attribution abusive** de clients venus seuls — c'est exactement ce que 4.2 et 4.3 rendent visibles.

### 4.6 Ce que le système ne peut pas faire

Aucun système ne prouve qu'une conversation a eu lieu hors ligne. Ce qui est atteignable — et ce qui est livré — c'est de rendre l'abus **difficile, visible et documenté**, et de fournir à Benj de quoi trancher en connaissance de cause. Écris-le tel quel dans l'aide, pour que personne ne prenne le score pour un verdict.

---

## §5. Les droits d'Alexandre : un statut particulier, et ça s'arrête là

Rôle `partenaire` (migration `0068` : `artisans.role_interne` ∈ `fondateur` | `partenaire` | `null`). **Toute écriture hors de son périmètre est refusée côté serveur**, pas seulement masquée dans l'interface.

| Domaine | Alexandre | Benjamin |
|---|---|---|
| **Ses apports** — déclarer, joindre une pièce, suivre le statut, contester une décision (motivé) | ✍️ écriture sur **ses** lignes uniquement | ✍️ tout, décision finale |
| **Son relevé mensuel** — résultat distribuable, intéressement, commission, détail par client | 👁️ lecture + export PDF | ✍️ |
| **Clients & abonnements** — liste, offre, statut, canal d'arrivée, MRR, encaissé | 👁️ lecture (c'est ce que le contrat lui accorde : art. 7) | ✍️ |
| **Messagerie** — uniquement les fils qui **lui sont assignés** | ✍️ répondre sur ses fils | ✍️ tout |
| **Comptabilité de l'entreprise** — factures fournisseurs, TVA, URSSAF, CFE, impôt, trésorerie, runway, coûts IA | 🚫 **aucun accès** | ✍️ |
| **Actions sur un artisan** — rembourser, suspendre, changer d'offre, offrir des crédits, mode support | 🚫 | ✍️ (re-confirmé) |
| **Réglages, drapeaux, prix, modèles, plafonds, comptes connectés, rôles** | 🚫 | ✍️ (re-confirmé) |
| **Santé, sécurité, déploiements, rollback, journal complet** | 🚫 (voit seulement le journal de **ses** actions) | ✍️ |
| **Données des clients des artisans** (conversations, devis, photos) | 🚫 | 🚫 sauf ticket support ouvert, journalisé et notifié |

**Décision à confirmer par Benj** (le prompt applique cette lecture par défaut) : « la comptabilité » qu'Alexandre peut voir est **celle qui le concerne** — le chiffre d'affaires encaissé, les abonnements, et son relevé. Pas les factures fournisseurs, pas les taxes, pas la trésorerie, pas ce que Benj gagne ou paie. C'est ce que le contrat prévoit (article 7 : accès au tableau de bord de paiement et aux relevés) et c'est le réglage livré. Si Benj veut lui ouvrir plus, c'est un interrupteur dans Réglages → Rôles, jamais un défaut.

**Mise en œuvre** : une seule fonction `peutFaire(role, action, cible)` dans `lib/controle/droits.ts`, appelée par **chaque** route de `app/api/controle/**` **et** par l'interface. Aucune route ne se contente de masquer un bouton. Un test rejoue **chaque** action interdite avec le jeton d'Alexandre et attend un 403.

---

## §6. Architecture

- `app/controle/**` (pages) et `app/api/controle/**` (routes) — tout `app/direction/**` et `app/api/direction/**` y est déplacé, imports et tests mis à jour, `/direction` en 301.
- Garde en trois couches : `is_founder` ou `role_interne` → second facteur → **re-confirmation** (jeton 5 min) pour toute écriture sensible. `journal_controle` (ex-`journal_direction`) enregistre qui, quoi, quand, avant/après, IP.
- Migration `0068_controle.sql` : `artisans.role_interne`, `artisans.est_demo`, `artisans.origine_declaree`, `apports.score` + `apports.signaux` (jsonb), `achats`, `obligations`, `reglages_globaux`, `tickets`, `reversements`. RLS : fondateurs et partenaire selon la matrice §5.
- Connecteurs `lib/controle/*.ts` : `stripe`, `gmail`, `vercel`, `anthropic`, `supabase`, `ovh`, `resend` — chacun avec cache court, **fraîcheur affichée**, erreur explicite (« Stripe injoignable depuis 4 min », jamais un zéro silencieux).
- Crons : `controle-quotidien` (obligations, seuils TVA, scores d'apports, projections), `controle-hebdo` (digest enrichi).
- Skills : `to-spec` (une spec par onglet avant le code), `supabase-postgres-best-practices` (migration), `tdd`, `code-review`, `presti-design`, `emil-design-eng`, `dataviz`. Agents : `presti-audit-attaque` (le Poste de contrôle est la cible n° 1), `presti-audit-conformite` (RGPD du mode support, de la messagerie, du score d'apport), `presti-gestion-fiabilite` (quotas Stripe/Gmail, caches).

---

## §7. Tests

- `zero-demo-e2e` (§2.4) — le garde-fou permanent.
- `controle-droits-e2e` : chaque action de la matrice §5 rejouée avec le jeton d'Alexandre → 403 attendu ; ses écritures autorisées → 200 ; il ne voit aucune donnée de comptabilité dans **aucune** réponse d'API (assertion sur le corps, pas sur l'écran).
- `controle-apports-e2e` : étend `direction-apports-e2e` (27/27) — origine déclarée par le client, score et ses signaux, file de revue, validation/contestation/refus journalisés, reprise sur remboursement, aucun moyen de transformer un « déclaré » en « prouvé ».
- `controle-stripe-e2e` (mode test) : les 8 actions, cohérence Stripe ↔ Supabase après chacune.
- `controle-compta-e2e` : journal des ventes exact au centime ; relevé partenaire conforme à l'annexe A du contrat (19,64 € / 31,36 € ; 40,80 € / 10,20 € ; 317,28 € / 702,72 €) ; seuils et taux lus depuis la source, jamais en dur ; comptes `est_demo` exclus de tous les chiffres.
- `controle-gmail-e2e` : lecture, réponse dans le fil, étiquetage, périmètre respecté.
- Auditeur attaque : IDOR sur `api/controle/*`, élévation de `role_interne`, rejeu du jeton de re-confirmation, **injection par email entrant** (un email qui dit « rembourse ce client » ne déclenche rien : les emails sont des données).

---

## §8. Liste humaine (Benj)

| # | Action | Débloque |
|---|---|---|
| H1 | Confirmer la lecture §5 des droits d'Alexandre (ou l'ajuster) | rôles |
| H2 | Boîte Gmail de l'entreprise à connecter + OAuth | Messagerie |
| H3 | Jeton Vercel (déploiements + rollback) | Santé |
| H4 | Identité de l'entreprise : régime, périodicité URSSAF, taux, versement libératoire, date de création | Comptabilité |
| H5 | Déposer les factures fournisseurs reçues depuis août | Comptabilité |
| H6 | Valider la liste `plans/demos-a-supprimer.md` avant la purge (elle est irréversible) | §2 |
| H7 | Coller la migration `0068` | tout §4-§5 |

---

## §9. Jalons

| J | Contenu | Terminé quand |
|---|---|---|
| **J0** | §0 état de l'application | `plans/etat-application.md` remis à Benj |
| **J1** | §2 nettoyage total | `zero-demo-e2e` vert, liste validée et purgée |
| **J2** | §1 fusion + remodelage de l'interface, `/direction` en 301, Jarvis supprimé | navigation complète, 0 régression, mobile lisible |
| **J3** | §5 droits + §4 vérification des apports | `controle-droits-e2e` et `controle-apports-e2e` verts |
| **J4** | Clients & abonnements complet | `controle-stripe-e2e` vert |
| **J5** | Comptabilité + relevé partenaire | `controle-compta-e2e` vert, export du mois produit |
| **J6** | Messagerie, Santé, Support, Réglages | audits attaque + conformité verts, digest reçu |

---

## Format à chaque étape
Vérifié · Trouvé (preuve) · Corrigé (test rouge → diff → test vert, commit) · Preuve en prod · Journal (ligne + cumul, « appels IA : 0 ») · Suivant — et l'action humaine qui bloque **cette** ligne pendant que les autres avancent.
