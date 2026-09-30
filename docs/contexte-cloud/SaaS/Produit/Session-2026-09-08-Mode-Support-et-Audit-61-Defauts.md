# Session 2026-09-08 — Mode support livré, puis un audit qui trouve 61 défauts

> Suite de [[Session-2026-09-03-v4-Audit-Legal-Securite]]. Deux moitiés de journée très
> différentes : la matinée livre le **mode support** (v11 §5), l'après-midi répond à une
> question de Benj — « le site est entièrement bon maintenant ? » — par un **audit sur sept
> angles** qui rend **61 défauts confirmés**. Tous corrigés le jour même. Migrations **0074
> → 0082**, toutes collées. Presti reste live.

## La question qui a tout déclenché

Benj : « le site est entièrement bon maintenant ? ». La réponse honnête était **non**, et il
a fallu un audit pour le savoir : sept angles que les suites ne couvrent pas **par
construction**, chaque trouvaille passée devant un sceptique chargé de la démolir. 61 ont
survécu : **7 graves, 27 moyens, 27 mineurs**.

Le précédent qui justifiait la méfiance : le 07/09, six routes `/api/control/*` (sans « e »)
fuyaient depuis des semaines. Aucun test ne les voyait — ils visaient `/api/controle/*`.

## Le mode support (v11 §5) — livré le matin

Ce n'est **pas** un « voir comme lui » : une session ouverte *en tant que* l'artisan
produirait des traces attribuées à lui, et il ne pourrait plus distinguer ses actes des
nôtres. C'est une **fenêtre d'une heure**, sur **un élément que l'artisan a désigné**
lui-même en demandant de l'aide, qui **naît fermée** et ne s'ouvre que par son clic.

- On n'y lit que la **forme** : statuts, dates, nombres, montants. Jamais le contenu des
  échanges, jamais les coordonnées de ses clients, jamais ses photos.
- **Deux traces par lecture**, dont une qu'il lit dans ses Paramètres, et qui part avec son
  export RGPD.
- **Pas d'email parti, pas de porte.** Un refus vaut 24 h. Trois demandes au maximum par
  ticket. Il peut poser un **verrou définitif** — et poser le verrou referme les fenêtres
  encore ouvertes.
- Preuve : `support-e2e` **36/36** contre la production.

**Effet de bord majeur, assumé** : les policies `founders_all_*` sont supprimées. Sous RLS,
Benj ne voit plus les devis / factures / demandes des autres artisans depuis son navigateur
(il en voyait **9, 12 et 9**). `/controle` n'est pas touché : ses routes lisent avec la clé
de service, qui est journalisée. Argument commercial : section **« Et nous, on voit quoi ? »**
en ligne sur la landing.

## Les 7 graves

| Défaut | Ce qu'il coûtait |
|---|---|
| Commission d'Alexandre **÷ 100** | 12 centimes au lieu de 11,80 € sur un client à 59 € |
| Avoir remboursant **plus** que sa facture | la remise perdue : 100 € rendus en trop sur une pièce scellée |
| Remboursement disparu du relevé | commission payée sur de l'argent reparti |
| Tableau de bord : « envoyée automatiquement » | une réponse que l'artisan avait **rejetée** — il croit son prospect servi |
| `DELETE` d'un devis envoyé | quatre écrans promettaient le contraire |
| Lignes de facture scellée modifiables | `0044` visait une policy qui n'existait pas sous ce nom |
| **Ma** 0074 : compte indestructible | dès qu'une lecture de support avait eu lieu |

Le premier vient d'un **nom** : `taux` ne disait pas s'il valait `0.2` ou `20`. Renommé
`tauxPct`. Et la commission est maintenant **décidable entre 10 et 20 %**, apport par apport
(0077) — le contrat fixe une fourchette, c'est Benj qui tranche. Un apport **contesté reste
plafonné à 10 %** même réglé à 20 : le contrat prime sur le réglage.

## Le motif qui revient — et la vraie leçon de la journée

Presque partout, le défaut n'était pas dans le code mais dans **ce qui était censé le
surveiller** :

- `support-e2e` **fabriquait ses tickets en base** : elle était verte pendant que le mode
  support était **inatteignable**, faute d'écran pour en créer un. *Un test qui contourne
  l'entrée ne prouve pas qu'il y en a une.*
- `suppressions-e2e` prouvait l'invariant sur la porte qui le **respecte**, jamais sur celle
  qui le violait — le motif exact de `/api/control` sans « e ».
- `controle-compta-e2e` écrivait `tauxApport: 20` à la main : elle testait **sa propre
  constante**, pas le chemin.
- Le **détecteur d'angles morts en avait un** : son filtre ne voyait ni les sondes, ni les
  unitaires, ni les gardes — neuf scripts n'étaient joués par personne.
- Quatre assertions ne pouvaient pas rougir, dont un `T(…, true)` joué **chaque nuit**.
- Le budget de performance **s'éteignait tout seul** quand une route changeait de nom, en
  continuant d'imprimer du vert.
- La garde anti-secrets protégeait contre le **format d'hier** (JWT), pas contre les
  `sb_secret_…` actuels.

> **Quand un test est vert, la première question utile est : qu'est-ce qu'il ne peut pas
> voir ?**

## Ce qui touchait les artisans sans qu'on le sache

- **Google Analytics** se serait chargé sur le site de **chaque artisan**, dont la page
  légale affirme « ce site ne dépose aucun cookie publicitaire ». On aurait fait mentir
  l'artisan **sur son site, à ses visiteurs, sous sa responsabilité**. Et sur
  `/reset-password`, où le jeton est dans l'URL.
- L'**adresse email d'un client d'artisan** partait en clair dans les journaux dès que le
  plafond d'envoi était atteint.
- Le **white-label était cassé** sur le lien de connexion : un client venu de
  `mondomaine.fr` recevait un lien vers `prestiapp.fr`.
- Une **facture dont les trois lignes ne s'additionnaient pas** : 255,00 + 14,03 = 269,02.
- Le **PDF d'une facture scellée** était réimprimé avec le régime de TVA d'**aujourd'hui**
  (0081 le fige à l'émission).
- La **facture électronique**, vendue dans les trois offres, n'avait **aucun bouton**.
- La relève des boîtes **se déclarait réussie en échouant** : toutes pouvaient tomber sans
  que rien ne l'annonce.

## Trois textes publics qui ne disaient pas la vérité

CGU (« IP pseudonymisées avant tout enregistrement » — le registre anti-abus les garde en
clair, et c'est justifié), la **page légale de chaque artisan** qui portait la même phrase,
et la FAQ (« mots de passe chiffrés » — ils sont **hachés** ; chiffré = réversible). Verrou
posé : `legal-e2e` refuse désormais ces formulations sur quatre fichiers.

## Migrations 0074 → 0082

| | |
|---|---|
| **0074** | mode support : tickets, accès, traces immuables, verrou |
| **0075** | l'artisan **désigne** l'élément — sans lui, aucun accès demandable |
| **0076** | la trace ne rend plus un compte indestructible |
| **0077** | commission d'apport **décidable, 10 à 20 %** |
| **0078** | lignes de facture scellée + devis envoyé : conservation en base |
| **0079** | `founders_read_artisans` — **14 profils avec IBAN** lisibles depuis un navigateur |
| **0080** | crédits offerts survivant au mois + un seul acompte par devis |
| **0081** | régime de TVA figé à l'émission |
| **0082** | quatre policies que le `revoke` rendait inatteignables |

## Trois choses que j'ai apprises à mes dépens

1. **Un fichier que Benj colle à la main est un livrable.** Mon générateur de jumeaux `_NU`
   a coupé un `comment on … is '…'` en plein milieu ; il l'a découvert dans le SQL Editor,
   en pleine action. Suite `migrations-jumelles-e2e` posée (167 contrôles), plus une bande de
   28 tirets en tête de chaque fichier pour que l'éditeur puisse mordre sans casser.
2. **Vérifier avant de supprimer.** `global-error.tsx` figurait dans la liste des composants
   « jamais importés » : c'est un fichier **spécial de Next.js**. Et sur les quatre derniers
   défauts, deux étaient du code mort, **deux étaient des écrans manquants**
   (`fermer_ticket`, le débannissement d'IP).
3. **Mes propres corrections méritent le même soupçon.** L'export RGPD que j'avais « réparé »
   le matin produisait `donnees/donnees/….json.json` doublement encodé.

## Décisions de Benj

- **Commission d'Alexandre variable, 10 à 20 %, c'est lui qui décide** → 0077.
- Section marketing sur la landing : **oui** (« Et nous, on voit quoi ? »).
- **Clés Stripe `rk_live_` : ne pas révoquer.** Vérifié : `.env.local` n'est pas suivi par
  git, aucune clé n'a jamais été committée — ma recommandation était excessive.
- **Comptes Play / Apple : reportés** aux premiers revenus. L'APK est déjà téléchargeable
  depuis le site.

## Fin de journée — le départ d'Alexandre, et ce qu'il a fait remonter

Benj : « vire Alexandre de l'entreprise, enlève ses accès privilégiés ». Fait, mesuré, journalisé
(0084). Le détail est dans [[Journal-Decisions]] ; ce qui vaut d'être gardé ici, ce sont les
**trois défauts que ce travail a fait sortir** — aucun n'était visible avant de tirer ce fil.

**1. Le repli qui promeut au lieu de dégrader.** `garde.ts` calcule
`role_interne === 'partenaire' ? 'partenaire' : 'fondateur'`. Vider le rôle sans retirer
`is_founder` ne réduit pas les droits : il les **augmente**. Un repli juste dans un cas (un compte
de Benj sans rôle) devient un piège dans un autre (un départ). Les deux colonnes tombent ensemble.

**2. Ma 0078 posait DEUX gardes, 0083 n'en levait qu'une.** La purge des comptes de test passait
les factures pour échouer trois lignes plus bas sur les devis. Mesuré : cinq comptes purgés, trois
partis, deux bloqués. Le progrès était invisible et le symptôme intact. → 0085.
*Quand une migration pose plusieurs gardes, la fonction de ménage doit les lever toutes — et le
compte se fait sur le fichier qui les pose, jamais de mémoire.*

**3. Le compte fantôme, et sa vraie cause.** Un compte polluait les chiffres depuis le matin. La
cause n'était pas lui : **sept suites créaient leurs comptes en `@x.fr`**, un domaine que
`purger_compte_test` refuse (elle n'accepte que `@presti-test.invalid`). Leur ménage supprimait
l'utilisateur de connexion, jamais la fiche `artisans` — qui restait, et comptait. `zero-demo-e2e`
vérifiait « aucun compte de connexion orphelin » et **pas l'inverse** : un sens couvert, pas l'autre.
Les sept suites purgent désormais vraiment, et le contrôle manquant est posé.

## Deux suites rouges depuis le matin : une seule cause

`messages-deauto-e2e` et `plateforme-intelligence-e2e` attendaient toutes deux `.pcfg-modes` sur
`/plateforme` — qui ouvre sur **Conversations**. L'écran Intelligence vit sous `?volet=reglages`.

Et derrière, un vrai défaut produit : le profil écrivait « ça se règle dans **Ma plateforme →
Intelligence** » avec un lien vers `/plateforme`. L'artisan à qui on venait de promettre un écran
atterrissait ailleurs. L'assertion, elle, vérifiait le **texte** du lien — jamais sa destination.
*Un test qui lit une promesse au lieu de la suivre reste vert pendant qu'elle est fausse.*
La suite clique désormais le lien, comme l'artisan.

Dessous, quatre sélecteurs périmés que le premier échec masquait : une case visée **par rang** qui
désignait la mise en pause au lieu de la plage horaire, un réglage devis déménagé dans
Automatisations, une adresse publique cherchée sur le mauvais écran, une classe de message qui
n'existe pas. Tous remplacés par ce qu'un humain vise : un libellé, un texte.

## Le collage : `constant` est refusé

0084 a été refusé par le SQL Editor : « syntax error at or near "constant", LINE 2 ». Ma première
explication — « les blocs `do` ne passent pas » — était **fausse**, et le contrôle que je venais
d'écrire l'a prouvé en rougissant sur 0072 et 0080, qui portent la même forme et sont passés sans
un mot. La seule différence tenait à ce mot-clé. Le verrou vise donc `constant`, pas les blocs
`do` : une règle large aurait allumé un rouge permanent sur deux migrations qui marchent.
*Un garde-fou toujours rouge ne signale plus rien.*

## Lighthouse mobile : trois vrais defauts, et un test qui mesurait la machine

Le budget de performance etait rouge depuis des jours (84 sur la landing, 88 sur `/p`) et je
l'avais range dans « mesure bruitee » sans le mesurer. C'etait deux erreurs a la fois : le bruit
etait reel, **et** il cachait trois vrais defauts.

**1. Le client Supabase sur chaque page.** `VerrouNatif` — le verrou biometrique de l'application
— est monte par le layout RACINE. Son propre en-tete dit pourtant « jamais actif [...] dans un
navigateur ». Chaque visiteur de la vitrine telechargeait, parsait et executait 181 Ko de client
d'authentification pour un composant qui rend `null` chez lui. *Un composant inerte n'est pas
gratuit : le navigateur ne sait qu'il ne fera rien qu'apres avoir tout charge.*

J'ai d'abord differe le composant (`next/dynamic`), puis annule : cela ouvrait une course avec
`NatifSplash`, qui retire l'ecran de lancement des le premier rendu — l'application serait restee
visible quelques instants **sans son verrou**. Ce sont ses dependances qui sont differees, pas lui,
et le prechargement demarre des le montage pour ne rien rallonger cote application.
*On ne troque pas une garantie de securite contre des points de performance.*

**2. Le hero invisible, et qui n'arretait jamais de bouger.** Les deux bulles de la conversation
etaient rendues par le serveur puis cachees en CSS (`opacity:0`) en attendant que le script pose
`.show` : le premier ecran montrait un cadre de demonstration **vide**. Et la boucle d'animation
repartait toutes les 7,2 s, pendant le chargement — la page ne se stabilisait donc jamais.
Resultat : **Speed Index 7,1 s pour un premier rendu a 1,3 s**. Corrige : la scene est lisible
d'entree, l'animation attend `load` puis un temps mort. **SI 7,1 -> 1,9-2,8 s.**

**3. Deux polices prechargees pour rien.** L'element qui decide du plus grand rendu sur la page
d'accueil est le mot « Presti » du bandeau — du TEXTE, qui attend sa police. Quatre polices se
disputaient la bande passante du premier ecran : **Fraunces**, qui ne sert que dans `site.css` et
`plat.css` (jamais dans `globals.css`), et **le mono**, qui n'habille que des horodatages de 9,5 px.
Les deux passent en `preload: false` — declarees, disponibles, mais plus au premier rang.

### Le test mesurait l'humeur du portable

Trois passes de suite sur le **meme code deploye** : **72, 73, puis 95**, avec un Total Blocking
Time allant de 960 ms a 60 ms. Le seuil ne bouge pas (90) ; c'est la methode qui change, et c'est
celle que Google recommande en local : premiere passe verte, on s'arrete ; premiere passe rouge,
deux de plus et **la mediane tranche**. Les trois valeurs sont imprimees — une vraie regression les
fait toutes baisser ensemble, du bruit non.

> Ranger un rouge sous « c'est bruite » sans le mesurer, c'est le meme geste que fabriquer un test
> qui ne peut pas rougir : dans les deux cas on decide a l'avance qu'il n'y a rien a voir.

Bilan mesure (mediane de trois) : **/ a 91**, **/p/atelier-du-chene a 92**. Poids de la page
d'accueil : 677 -> 486 Ko.

Puis la suite officielle, seuil inchange, deux passages complets :
**95 / 93 / 90 / 93**, puis **94 / 97 / 93 / 96** (`/`, `/login`, `/dashboard`, `/p`),
accessibilite **100** partout — et au second passage, tout des la premiere mesure : la mediane
n'a meme pas eu a servir. Elle avait servi au premier : `/` a fait **85** avant 95 et 96, ce que
l'ancienne methode aurait declare rouge. **Suite mobile complete : 100 reussis, 0 echoues.**

Et un dernier rouge, qui n'etait pas du bruit non plus : le bouton « Voir scene par scene » de la
demonstration mesurait **342 x 24 px**. Vingt-quatre pixels de haut, c'est la hauteur de sa ligne
de texte — la moitie du minimum de 44 px (WCAG 2.5.5, regles d'Apple). La suite n'exempte que les
LIENS dans un texte courant, jamais les boutons, et elle a raison. Padding pour agrandir la zone
touchable, marge negative pour la reprendre dans le flux : rien ne bouge a l'oeil, tout se
rattrape au doigt.

## Reste ouvert

- Le mot de passe de la base est refusé (`28P01`) : `scripts/appliquer-migration.mjs` attend
  qu'il soit régénéré pour poser les migrations **sans copier-coller**. `DIRECT_URL` ne sert
  à aucun code de Presti — la réinitialiser ne casse rien.
- Deux acomptes de 3,55 € du 02/09 sur un compte fondateur : l'index unique de 0080 ne se
  posera qu'une fois soldés par un avoir (décision de Benj, pas d'une migration).
- Santé avancée (déploiements Vercel + rollback, coûts IA par fonction).
- ~~Lighthouse mobile — « mesure bruitée »~~ : **traité**, voir la section ci-dessus. Le bruit était réel, et il cachait trois vrais défauts.

Voir aussi : [[Récap-Projet]], [[Architecture-v2-Devis-Factures-SiteClient]],
[[Session-2026-09-03-v4-Audit-Legal-Securite]].
