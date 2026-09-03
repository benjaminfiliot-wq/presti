# Audit final v4 — 3 septembre 2026

Exécuté conformément au §16 du plan, par **quatre auditeurs indépendants** n'ayant pas
écrit le code audité, chacun sur son domaine, avec obligation de preuve pour chaque point
et de correctif chiffré pour chaque défaut. Tests menés **contre la production**
(`prestiapp.fr`) et la base réelle, avec des comptes créés puis détruits.

> **Ce qu'il faut retenir en une phrase** : l'ossature est saine — RLS complète, secrets
> absents du bundle et de git, IDOR systématiquement bloqué, verrous d'offre côté serveur,
> SSR correct sur les trois surfaces — et les défauts trouvés sont des **oublis de
> périmètre** (une colonne non figée, un bucket resté public, une branche de code jamais
> empruntée), pas un défaut d'architecture. Mais trois d'entre eux étaient sérieux, et
> **deux annulaient une correction de sécurité livrée le jour même**.

---

## 1. Ce qui a été corrigé et vérifié le jour même

Chaque correctif est rejoué par `scripts/audit-correctifs-e2e.mjs` — qui reproduit
**exactement l'attaque décrite par l'auditeur**. C'est la seule façon de savoir qu'un
correctif tient. **19/19 en production.**

| # | Défaut | Gravité | Preuve de l'auditeur | Correctif |
|---|---|---|---|---|
| 1 | **Les photos de chantier des clients étaient téléchargeables par n'importe qui.** Bucket `lead-media` public, listing anonyme énumérant les identifiants de demandes. Photos de domiciles privés, prises à l'intérieur. | Élevée | `anon.storage.list('')` → 1 dossier ; `GET .../0.webp` sans jeton → **200, image/webp** | Bucket privé + `/api/leads/photos` qui signe des liens d'une heure, après vérification de propriété (migration 0045) |
| 2 | **« Fermer toutes mes sessions » ne fermait rien.** `auth.admin.signOut(uid)` attend un JETON : l'appel répondait 403, l'erreur était jetée en silence, et le jeton de rafraîchissement survivait. Un jeton copié se refabriquait un accès **indéfiniment**, pendant que l'écran affichait « toutes vos sessions ont été fermées ». | Élevée | Séquence complète mesurée : révocation → ancien accès 401 ✔ → **refresh rejoué → 200** → jeton reforgé → `/api/tarifs` **200** | `revoquer_sessions_auth()` supprime `auth.sessions` (cascade sur les jetons de rafraîchissement) ; la route répond 500 au lieu d'annoncer un faux succès (migration 0043) |
| 3 | **La révocation était annulable par sa propre cible.** `sessions_invalides_avant` n'était pas figée par le verrou de privilèges : avec le jeton volé, on la remet à NULL et l'accès revient. | Élevée | `avant 200 · après déconnexion 401 · après remise à zéro **200**` | Colonne figée dans `lock_artisan_privileges()` (migration 0045) |
| 4 | **Aucune facture n'était scellée.** Le scellement ne vivait que dans une branche jamais empruntée → les déclencheurs d'immuabilité ne se déclenchaient jamais. Avec le seul jeton du navigateur : montant modifiable, numéro modifiable, **facture supprimable**. | Élevée (fiscale) | `PATCH total_ttc=1 → 204`, `DELETE → 204`, relecture → `[]`. État réel : 10 factures, **0 verrouillée** | Scellement à la création + RLS en lecture/insertion seules + rattrapage des factures existantes (migration 0044) |
| 5 | **La case « assujetti à la TVA » n'écrivait jamais le régime.** Un artisan assujetti continuait d'émettre à 0 % avec la mention « TVA non applicable ». | Élevée (fiscale) | Rejoué en prod : après enregistrement, `{"tva_num":"FR…","tva_regime":"franchise"}` ; devis de 1 200 € HT sorti à 0 % | 1 ligne dans `/parametres` + rattrapage en base (0 compte concerné en production — le défaut était latent) |
| 6 | **Détournement de domaine.** `domaine` écrivable en base : un artisan en offre gratuite pouvait s'attribuer le domaine d'un concurrent ; le middleware (limit 1) résolvant au premier venu, le trafic partait chez lui. | Moyenne | 2 artisans portant le même domaine après un simple `update` | `domaine` et `domaine_verifie` figés (migration 0045) |
| 7 | **`appliquer_mouvement` exécutable anonymement** et prenant l'artisan en paramètre au lieu de le déduire de la session : elle contournait la RLS. | Faible (deux UUID à deviner) | Appel anonyme acceptée, stock d'un artisan remis à 0 | Dérive `auth.uid()`, non accordée à `anon` (migration 0045) |
| 8 | **Une promesse fabriquée que j'avais moi-même introduite.** En retirant les mentions inventées de la bande de réassurance, j'y avais remis « votre demande reçoit une réponse en quelques minutes » — en dur, sans mesure. Promesse de délai non tenue = pratique commerciale trompeuse, portée par l'artisan. | Moyenne | Texte servi en production | Remplacée par `computeResponseDelay()`, la mesure réelle sur 30 jours, qui **se tait** faute de données |
| 9 | **La marque blanche se cassait à l'endroit le plus visible** : le devis PDF envoyé au client final et les relances partaient de « Presti », le sujet de la relance affichant même « — Presti ». | Moyenne | Lecture de code : `fromName` absent sur 2 des envois les plus exposés | `fromName: artisan.nom` sur les deux |
| 10 | **Canoniques fausses.** `/p/[slug]`, `/faq`, `/cgu`, `/mentions-legales` et `/confidentialite` se déclaraient toutes comme **la page d'accueil** (canonique héritée du layout racine), tout en figurant au sitemap. Google suit le canonical : ces pages n'étaient pas indexables, et tout le contenu FAQ était produit pour rien. | Moyenne | `curl` sur les 5 pages | `alternates.canonical` sur chacune |
| 11 | **Deux infractions axe CRITIQUES** sur `/login` et `/signup` : `<label>` sans `htmlFor`, champs orphelins — un artisan utilisant un lecteur d'écran ne pouvait pas se connecter. Le test a11y était vert **parce qu'il ne testait que le site et la plateforme**. | Moyenne | axe : `critical · label (2)` sur chaque page | `htmlFor`/`id` + `autoComplete` (WCAG 1.3.5) |
| 12 | **Le champ « Email ou téléphone » acceptait n'importe quoi.** « pasunemail » partait en base, la page répondait « merci », l'artisan recevait une demande **qu'il ne pouvait pas recontacter** — sans le savoir. | Moyenne | Ligne retrouvée en base : `{"contact":"pasunemail","statut":"repondu"}` | Validation serveur, avec un message qui explique pourquoi |
| 13 | **CSP : `connect-src` autorisait `https://*.supabase.co`** — n'importe quel projet Supabase du monde, soit un canal d'exfiltration tout prêt. | Moyenne | Preuve différentielle : `fetch` vers `example.org` bloqué, vers un autre projet Supabase **non bloqué** | Épinglé sur le projet |
| 14 | **La landing vendait ce qui n'existe pas.** « Plusieurs métiers / activités » en Signature à 99 €/mois (la table n'a qu'une colonne métier) ; « Site web pro · bientôt » alors qu'il est livré ; « Expert : 10×/mois » contredit par le code (250 crédits ÷ 3 = 83). Et l'inventaire, livré, n'était vendu nulle part. | Moyenne | `app/page.tsx` vs `lib/plans.ts` | Promesses alignées sur ce qui est réellement livré |
| 15 | **7 comptes de test d'anciennes sessions traînaient en base.** | Faible | Aucun publié, donc invisible — mais la règle est « zéro donnée de démo en base » | Purgés |

**Angle mort de nos propres tests, comblé** : `rls-e2e.mjs` ne rejouait que le jeton
d'accès, qui expire de toute façon en une heure. Il rejoue désormais le **jeton de
rafraîchissement** — c'est celui-là qu'un voleur se procure, et c'est celui-là qui doit
mourir. C'est cet angle mort qui avait laissé passer le défaut n° 2.

---

## 2. Ce qui a été vérifié et tenu

| Domaine | Constat de l'auditeur |
|---|---|
| **Isolation entre artisans** | 26 tables avec RLS active, aucune policy `using (true)`. `rls-e2e` **33/33** : un artisan ne lit ni n'écrit aucune ligne d'un autre. Avec la seule clé publique anonyme : lecture refusée partout. |
| **Secrets** | 205 fichiers du bundle scannés contre les vraies valeurs et contre des motifs génériques : **aucun secret**. Historique git complet (17 Mo de diff) : **aucune clé jamais committée**. |
| **IDOR** | Le jeton de A sur les ressources de B renvoie **404** sur toutes les routes testées, données de B intactes. |
| **Verrous d'offre** | Testés en changeant le plan entre chaque appel : inventaire `gratuit/essentiel → 403`, `studio/signature → 200` ; domaine `→ 403` sauf Signature ; niveaux de site **réellement absents du HTML**, pas masqués en CSS. |
| **Rendu serveur (le sujet « ton site est invisible »)** | **Aucun mot** n'apparaît uniquement après exécution du JS, sur les trois surfaces. Le site vitrine sert même **128 %** du texte final. h1, hero et liens présents sans JS. Le problème visé **ne s'applique pas** à Presti. |
| **Anti-énumération d'emails** | Connexion, réinitialisation et lien magique client : réponses identiques pour un compte connu et inconnu. |
| **Mots de passe** | bcrypt coût 10, 60 caractères, **100 % des comptes**. Aucun hash générique. |
| **Injection de prompt** | 5 attaques réelles en production, toutes tenues — y compris la fermeture du bloc de données pour reprendre la main. |
| **Provenance des prix** | Le devis IA porte une provenance par ligne, **revérifiée serveur** contre le catalogue réellement transmis. Un libellé inventé retombe sur « estimation ». |
| **Numérotation** | RPC atomique, non accordée aux rôles clients, compteurs figés par trigger. Testée : `DEV-2026-0001 → 0002 → 0003` sans collision sur deux artisans. |
| **Performance** | Site **107 Ko**, plateforme **108 Ko** (budget 135). LCP < 1 s, CLS 0 sur les trois surfaces, en 390 px. |
| **Mobile** | Aucun scroll horizontal jusqu'à **320 px** sur les trois surfaces. |
| **Liens** | Crawl complet depuis 7 points d'entrée : **0 lien mort**. |
| **Cookies** | **Aucun `Set-Cookie`**, aucun script tiers, `localStorage` vide sur les surfaces publiques. |
| **Webhook Stripe et cron** | Fail-closed : 503/401 sans secret configuré. |
| **RGPD — droits effectifs** | Export testé (8 clés, aucun mot de passe dans le paquet) ; effacement granulaire avec récapitulatif honnête, anonymisation qui préserve la chaîne comptable. |

---

## 3. Ce qui reste ouvert — par ordre de gravité

### Réglages de tableau de bord (Benj, quelques minutes chacun, aucun code)

| Point | Où | Pourquoi |
|---|---|---|
| **Détection de rejeu des jetons de rafraîchissement** | Supabase → Auth → Sessions | Un jeton volé donne aujourd'hui un accès parallèle **invisible**. Ce réglage le détecte et révoque la chaîne. |
| **Durée du jeton d'accès : 3600 s → 900 s** | Supabase → Auth | Divise par 4 la fenêtre pendant laquelle un jeton volé reste utilisable en direct sur PostgREST. Invisible pour l'artisan (rafraîchissement automatique). |
| **Politique de mot de passe** | Supabase → Auth → Passwords | `12345678`, `password`, `presti123` sont aujourd'hui **acceptés** (GoTrue n'impose que 6 caractères). Porter à 10-12 + déni-liste HaveIBeenPwned. |

### Chantiers de fond (chiffrés par les auditeurs)

| Chantier | Effort | Pourquoi c'est sérieux |
|---|---|---|
| **Les surfaces de l'artisan n'ont aucune existence juridique** — pas de mentions légales, pas de politique de confidentialité, aucune information des personnes sur `/p/[slug]` alors qu'on y collecte nom, coordonnées, description de panne, photos de domicile et **IP**. | ~8 h | C'est **l'artisan** qui est responsable de traitement : c'est lui que la CNIL sanctionnerait. Et un site vendu sans mentions légales est en infraction LCEN — or c'est Presti qui l'a produit. **La classe CSS `.plat-consent` existe et n'est rendue nulle part** : la place était prévue, le contenu n'est jamais venu. |
| **Accord de sous-traitance (art. 28) absent** entre Presti et l'artisan | ~1 j (rédaction) | Presti traite les données des prospects **pour le compte** de l'artisan. Sans DPA, l'artisan est en infraction du seul fait d'utiliser l'outil. |
| **Jeton d'accès stocké en `localStorage`, pas en cookie `httpOnly`** | 1 à 1,5 j | Aucun vecteur XSS trouvé (zéro `innerHTML`, zéro `eval`), donc **latent** — mais le rayon d'action serait total. Migration vers `@supabase/ssr`. |
| **28 lectures/écritures clientes vont directement à PostgREST**, hors de la garde de révocation | 2 à 3 j | La révocation ne couvre que les routes de Presti. Borné par l'expiration du jeton (d'où l'intérêt du réglage à 900 s ci-dessus). |
| **Course sur les compteurs de limitation** (`select count` puis `insert`) | ~3 h | En rafale parallèle : 11 réponses IA + 11 emails là où 6 sont permis. Coûte de l'argent. Correctif : comptage atomique en base, comme `consume_credit` le fait déjà. |
| **Bombardement d'emails de réinitialisation** — le plafond est global, pas par email | ~1 h | 13 emails envoyables à une cible. `/api/p/auth` fait déjà les choses correctement : s'en inspirer. |
| **Mentions obligatoires non contrôlées avant émission** — 10/10 comptes en production ont `siret = null` | ~2 h | Amende de 15 € par mention manquante ; jusqu'à 3 000 € pour l'absence de mention d'assurance décennale sur un devis du bâtiment. |
| **Médiateur de la consommation et bordereau de rétractation absents** | ~6 h | Un devis signé au domicile sans bordereau est annulable **12 mois**, et l'infraction est pénale. |
| **Image de partage et favicon** : le site de l'artisan déclare `summary_large_image` **sans image** (carte cassée sur WhatsApp — le canal par lequel un artisan partage son site) et sert **le favicon de Presti** dans l'onglet du client | ~6 h | La promesse « votre site, votre marque » est démentie au premier partage. |
| **404 douces** : `/site/<slug-inexistant>` et `/p/<slug-inexistant>` renvoient **200**, et une sous-page d'un site artisan sert la 404 **aux couleurs de Presti** | ~3 h | Fuite white-label sur domaine perso, et pages fantômes indexables. |
| **Le filtre anti-fabrication ne voit que les chiffres et les labels** | ~4 h | Génération réelle observée : « en atelier », « je me déplace chez vous », matériaux étendus à des prestations non déclarées — aucun ne déclenche les regex actuelles. |
| **Durées de conservation non documentées et aucun mécanisme de purge** | ~4 h | Seule la facturation est chiffrée (10 ans). Leads, messages, photos et IP restent indéfiniment. |
| **Titres et descriptions dupliqués** sur 5 à 8 pages de la landing | ~3 h | SEO. Le titre de `/` fait 70 caractères, la description 183. |
| **Pas de bandeau de consentement** | ~4 h | Conforme **par absence d'analytics** aujourd'hui — rien n'empêche l'activation de Google Analytics de tout casser. |
| **Factur-X** : XML CII produit, mais pas embarqué en PDF/A-3 ni validé au Schematron | ~1 j | Structure conforme ≠ facture certifiée. Échéance réelle : 01/09/2027. |

---

## 4. Ce que je retiens de cet audit

**Trois des défauts les plus graves étaient les miens, et deux annulaient une correction
que je venais de livrer le jour même.** La révocation de sessions en est l'exemple exact :
j'ai trouvé la faille, écrit le correctif, écrit le test, vu le test passer — et le
correctif ne marchait pas, parce que mon test ne rejouait que le jeton d'accès. Un test
qui ne vérifie que ce qu'on a pensé à vérifier donne une **fausse assurance**, ce qui est
pire que pas de test : on cesse de chercher.

Deuxième leçon, plus générale : **quatre des défauts viennent d'un périmètre oublié, pas
d'une erreur de raisonnement.** Une colonne ajoutée sans être ajoutée au verrou. Une
branche de code jamais empruntée. Un bucket resté public depuis sa création. Un test a11y
vert parce qu'il ne regardait pas les bonnes pages. C'est pour ça que le commentaire de
`lock_artisan_privileges()` porte désormais un avertissement explicite : toute nouvelle
colonne sensible doit y passer.

Troisième : **j'ai remplacé une affirmation inventée par une autre.** En retirant
« Travail assuré » de la bande de réassurance — un fait sur l'entreprise que personne
n'avait déclaré — j'y ai mis « une réponse en quelques minutes », qui n'était pas plus
fondé. La règle anti-fabrication ne se respecte pas en supprimant les mentions les plus
visibles ; elle se respecte en ne mettant que ce qui est mesuré.

---

*Rapports détaillés des quatre auditeurs : dans la transcription de session du 2026-09-03.
Correctifs vérifiés par `scripts/audit-correctifs-e2e.mjs` (19/19) et `scripts/tout-verifier.mjs` (11/11 en mode rapide).*
