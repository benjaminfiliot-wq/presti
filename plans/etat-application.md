# Où en est l'application ? — état honnête au 07/09/2026

> Prompt v11 §0. Règle appliquée : **si une chose n'a jamais tourné sur un vrai appareil, elle n'est pas
> « faite ». Si une migration n'est pas collée, ce qui en dépend n'est pas « livré ».**
>
> La colonne « Preuve » ne cite que ce qui a réellement tourné, avec le nombre de contrôles et l'endroit.
> Les nombres qui ne sont pas d'aujourd'hui portent leur date : je ne rejoue pas 49 suites pour écrire un
> tableau, mais je ne fais pas non plus passer un chiffre de mardi pour un chiffre de ce soir.

---

## Le tableau

| Jalon v9 | État | Preuve | Ce qui manque |
|---|---|---|---|
| **J1 — PWA** (manifeste, service worker, hors-ligne, invitation à installer) | ✅ **prouvé** | `pwa-e2e` **71/71** en production (07/09) | rien |
| **J2 — Push web** (VAPID, abonnements, envoi, purge) | ✅ **prouvé** | `push-e2e` **39/39** en production (07/09) ; clés VAPID posées sur Vercel | rien côté web |
| **J3 — Capacitor Android** (plugins, liens profonds, APK signé) | ⚠️ **écrit et signé, jamais installé** | `smoke-android` **18/18** en intégration continue ; `liens-profonds-e2e` **19/19** ; APK signé public `mobile-v0.1.3` | **personne ne l'a lancé sur un téléphone.** C'est le trou principal |
| **J4 — Sécurité de la coque** (cookie `httpOnly`, trousseau, verrou biométrique) | ⚠️ **écrit, non éprouvé sur appareil** | revue native intégrée (07/09) : `registerPlugin` corrigé — c'était la cause du scan de codes-barres mort | le verrou et le trousseau ne se prouvent que sur un vrai appareil (`mobile/TESTS.md`, points 4-5) |
| **J5 — Pipeline Play** (test interne) | ❌ **bloqué** | fiches rédigées (`mobile/STORES.md`), compte de relecture créé | **M2** : compte Play Console (25 $), à créer par Benj |
| **J6 — iOS / Codemagic / TestFlight** | ❌ **bloqué** | rien de compilé | **M1** (Apple Developer, 99 $/an, D-U-N-S : 1 à 2 semaines) et **M5** (Codemagic ou un Mac) |
| **J7 — Fiches stores, soumission** | ❌ **bloqué** | textes et captures prêts | **M2**, **M8** (disponibilité du nom « Presti ») |

---

## 1. Ce qui est en production et prouvé

- **La PWA** : installable, fonctionne hors ligne, invitation à installer. 71 contrôles verts contre la
  production.
- **Les notifications web** : abonnement, envoi, purge des abonnements morts. 39 contrôles verts.
- **Firebase** (M3) : projet créé par Benj, fichiers posés, l'API d'envoi accepte le compte de service
  (elle refuse un jeton bidon avec une erreur 400 — c'est la preuve qu'elle regarde vraiment).
- **La signature Android** : le magasin de clés existe, l'AAB et l'APK sont signés, la chaîne
  d'intégration continue les produit à chaque tag.
- **Le Centre de direction** (travail du v10, à déplacer par le v11) : socle prouvé `direction-e2e`
  **72/72**, registre des apports `direction-apports-e2e` **27/27**, gestes d'argent en mode test Stripe
  `direction-argent-e2e` **52/52**.

## 2. Ce qui est écrit mais pas prouvé

- **Toute la coque Android sur un vrai téléphone.** L'APK est signé et public, la chaîne de compilation
  est verte, les liens profonds sont vérifiés côté serveur — mais **aucune installation réelle**. Tant
  que ça n'a pas tourné sur l'appareil de Benj, je ne peux pas dire que l'application fonctionne. C'est
  la seule chose qui bloque la fin du v9 et elle ne coûte rien : `mobile/TESTS.md`, dix minutes.
- **Le verrou biométrique et le trousseau** : le code est là, la revue est passée, l'appareil manque.
- **La notification native** (par opposition à la notification web) : Firebase accepte le compte, mais
  aucune notification n'a été **reçue** sur un téléphone.

## 3. Ce qui est derrière un drapeau baissé, et pourquoi

| Drapeau | Ce qu'il ferme | Pourquoi il est baissé |
|---|---|---|
| `actionsArtisan` | les huit actions sur la fiche d'un artisan (crédits, suspension, réactivation, message, portail, offre, remboursement, pause) | la migration `0068` n'est pas collée. Ordre appris le 03/09 : coller **puis** lever, jamais l'inverse |
| `messagerie` | la boîte de l'entreprise (fils, classement, réponse) | la migration `0069` n'est pas collée |
| `inventaireOcr` | la lecture automatique d'une facture fournisseur | fonction non finie |
| `canauxWhatsapp`, `canauxReseaux` | ces deux canaux | non commencés — et **ils ne figurent pas dans la grille tarifaire** tant qu'ils n'existent pas (règle anti-promesse du v5) |

Un drapeau baissé, c'est **404 sur les routes** et **rien dans l'écran** : pas un bouton grisé, pas un
onglet vide. C'est vérifié par une suite à chaque fois.

## 4. Ce qui est bloqué par Benj, et l'effet exact de chaque blocage

| # | Action | Coût | Effet du blocage |
|---|---|---|---|
| **M7** | **Installer l'APK sur son téléphone** et suivre `mobile/TESTS.md` | gratuit, 10 min | **Rien du J3/J4 ne peut être déclaré fait.** C'est le blocage le plus cher et le moins coûteux à lever |
| **M2** | Compte Google Play Console | 25 $ une fois | pas de test interne, pas de publication Android |
| **M1** | Apple Developer (organisation, D-U-N-S) | 99 $/an, 1 à 2 semaines | rien d'iOS ne peut commencer — **à lancer en premier à cause du délai** |
| **M5** | Codemagic, ou un Mac avec Xcode | gratuit (500 min/mois) | pas de compilation iOS |
| **M8** | Vérifier la disponibilité du nom « Presti » sur les deux stores | gratuit | risque de refus tardif ; repli prévu : « Presti — Artisans » |
| **0068** | Coller `_A_COLLER_sql_editor_0068.sql` | 1 min | la fiche d'un artisan reste en lecture seule |
| **0069** | Coller `_A_COLLER_sql_editor_0069.sql` | 1 min | pas de messagerie d'entreprise |
| **Clé Anthropic** | La valeur de la clé « presti produit » de l'espace Presti, dans `.env.local` | 2 min | le coût IA du produit se mesure sur l'ancien espace, où mes appels de développement se mélangent aux siens |

## 5. Ce que j'ai commencé et laissé en plan

- **Deux migrations écrites, non collées** : `0068_suspensions.sql`, `0069_courriers.sql`.
- **Un conflit de numérotation à trancher** : le v11 §6 demande une migration `0068_controle.sql`
  (`role_interne`, `est_demo`, `origine_declaree`, scores d'apports, `achats`, `obligations`,
  `tickets`, `reversements`). Or `0068` est déjà pris par les suspensions, non collée. **Je fusionnerai
  les deux dans un seul `0068`** plutôt que de laisser deux fichiers du même numéro — sauf avis
  contraire.
- **51 Mo de binaires dans l'historique git** : un `git add -A` trop large de ma part a poussé un APK et
  un cache TypeScript. Retirés du suivi, mais toujours dans l'historique du commit `420417b`. Les en
  purger demande une réécriture d'historique, que je ne fais pas sans que Benj le dise.
- **Une revue adversariale en cours** sur les lots J2b/J2c, lancée ce soir. Ses trouvailles seront
  intégrées au code déplacé, pas au code jeté.
- **Six comptes de test et sept factures de test en production** : inventoriés dans
  `plans/demos-a-supprimer.md`, purge en attente de validation (elle est irréversible).

## 6. Mon estimation du temps restant

| Jalon | Reste à faire | Estimation |
|---|---|---|
| J3 + J4 | Benj installe et suit `TESTS.md` ; je corrige ce qui remonte | **10 min de lui**, puis 1 à 3 h selon ce qu'il trouve |
| J5 (Play) | compte créé → dépôt, fiche, test interne, corrections de refus | 2 à 4 h après M2 |
| J6 (iOS) | compte Apple → Codemagic → compilation → TestFlight | 4 à 8 h après M1 et M5, **plus** le délai D-U-N-S |
| J7 (soumission) | dépôt sur les deux stores, réponses aux relecteurs | 2 h + 1 à 7 jours d'attente **par store** |

**Autrement dit** : côté code, l'application est à **une soirée de la fin** pour Android. Ce qui reste
n'est pas du développement, c'est **une installation sur un téléphone, deux comptes de développeur et
l'attente des stores**.

---

## Ce que je fais ensuite

Le v11 §0 dit : finir ce qui manque à l'application si c'est court (< 2 h) ou bloquant, sinon attaquer
le prompt. Ce qui manque à l'application n'est **pas du code** — c'est l'appareil de Benj et deux comptes
payants. Il n'y a donc rien de court à finir de mon côté.

**J'attaque donc le v11**, dans l'ordre de ses jalons, en commençant par le grand nettoyage (§2) dont
l'inventaire est déjà fait et dont la partie dangereuse a déjà été traitée. Le reste de l'application
est chiffré ci-dessus, et rien n'y est perdu.
