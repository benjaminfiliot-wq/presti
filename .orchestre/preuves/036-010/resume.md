## Ressources utilisées

- **Réseau neuronal, MCP `cerveau`** (skill `reseau-neuronal` chargé d'abord). `regles_pour` (« maquettes… connexions Gmail, départements, envoi automatique, données client ») a rendu `memoire-presti/nuit-0311-consignes-benj.md`, lu en entier. Ce que ça a changé : on écrit « assistant », jamais « agent » ; les bénéfices passent avant les fonctions ; pas de vidéos de @restructureai pour l'interface. Le juge refuse donc tout jargon (agent, n8n, workflow, prompt, pipeline). `chercher` sur « verdicts de Benj interface CRM atelier » puis « piste A Instrument » m'a mené à `presti/plans/refonte-1018/DIRECTION.md` (piste A, validée par Benj le 19/10 : chiffres en mono, liseré par nature d'urgence, règle graduée) et à `memoire-presti/crm-vivant-3d-2010.md` (l'atelier vivant existant). Je n'ai rien écrit dans le vault.
- **Prompt 6, `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`.** Lus : la partie 0 (patterns A, B, C et D, et F, ce qu'on ne reprend pas) et le prompt 1, § 1.1 à 1.4, dont le § 1.3 (p6:343-353). Ce qu'il fixe dans les écrans : les quatre écrans et leurs éléments, le double chemin (B3), une question à la fois (B4), aucune promesse ni aucun chiffre de vidéo.
- **Le plan, `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`.** Lus : § 2 (où chaque pattern se branche), § 3.3 (le tableau Studio / Signature par type d'action) et § 5 (les cinq décisions par défaut). Ce qu'il a changé :
  - les lignes de « Mes départements » et leurs verrous sont celles du tableau 3.3 ;
  - émettre une facture, marquer payée, une commande fournisseur et un avis négatif sont « Toujours à vous » (`OUTILS_JAMAIS_AUTO`) ;
  - un rendez-vous n'est jamais posé seul (décision 5) ;
  - le SMS reste préparé sur le téléphone de l'artisan (décision 4) ;
  - la fiche Google ouvre « sur demande » (décision 3) ;
  - Gmail et l'IMAP passent en premier (décision 2) ;
  - les autorisations sont chiffrées et « Retirer » efface (décision 1) ;
  - le pilote est réglé à 10 minutes et 20 envois par jour.
- **`plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 5.** C'est la matrice des outils. Les 19 entrées sont reprises dans « Connexions » et vérifiées une par une par le juge.
- **Prompt 3, `plans/011-cadrage-01-11/prompts-benj/p3-assistant.md` (l. 40-52, 138-185, 591-593), et sa correction `p3-assistant-bloc-offres-corrige-0111.md`.**
  - L'accueil est l'assistant : zone de conversation, priorités, actions, derniers devis et factures, chantiers en cours.
  - La fiche du CRM est complète : historique, devis, factures et chantiers liés, documents, notes, statut, prochaine action recommandée.
  - « L'artisan ne voit jamais n8n, MCP, agents ou prompts » (l. 49). C'est pourquoi l'onglet « Pipeline » est rebaptisé « Suivi des devis » (le jargon cité l. 593).
- **`plans/011-cadrage-01-11/c2-lot6/reference-claude-com.md`.** C'est la propreté de l'appli Claude, appliquée telle quelle :
  - fond `#141413`, ivoire `#faf9f5`, gris chauds ;
  - titres en serif, corps en sans, rayon de 8 à 10 px ;
  - bouton principal plein clair, bouton secondaire à contour fin ;
  - barre latérale sobre avec « Nouvelle demande ».
- **Les vidéos déjà analysées.**
  - `plans/analyse-videos.md` l. 672 (« Arrêtez de construire des CRM avec l'IA », @realbastianvolkis 7685717353828519170). Elle donne le panneau du CRM, qui pose une seule question, écrit sous chaque réponse ce qu'il a mis à jour et affiche l'avancement (« Question 2 sur 3 »). Son « erreur à éviter » (le vert servait d'annotation) confirme la règle : chez nous, le vert ne dit que « validé ».
  - `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` § 3.3 (trevsagents : le coût de l'IA affiché en clair) et § 5 (la carte de lot avec ses exclus, une proposition écartée qui ne revient pas, le centre de commande pour approuver). Ils ont donné le compteur de coût IA, avec son plafond, et le lot du lundi : qui reçoit, qui est exclu et pourquoi (C9).
  - `docs/connaissance-videos/` : je n'ai pas relu de nouvelle fiche, les patterns D1 à D3 sont pris par le plan.
  - Les fiches de @restructureai (`fiches-videos-restructureai.md`) sont **écartées pour l'interface**, selon la consigne de Benj du 03/11. Seule leur forme passe par le plan : le feu vert (A5) et les exceptions préparées (A6).
- **Skill `presti-design`.** L'accent est le corail `#D97757`, jamais du bleu ni du violet. Le mouvement réduit est respecté partout, et la piste A « Instrument » sert la console.
- **Skill `frontend-design`.** Il impose un plan avant le code et une signature unique. La signature retenue est **le feu vert** : un rond qui se remplit, seul vert de l'interface, sur chaque ligne et sur « Tout valider ». S'y ajoute la règle graduée du délai d'annulation, reprise de la piste A. J'ai écarté le gabarit « gros chiffre, petit libellé, dégradé ».
- **Skill `emil-design-eng`.**
  - Une seule entrée au chargement : 260 ms, `cubic-bezier(.23,1,.32,1)`, cascade de 40 ms, rien depuis `scale(0)`.
  - `scale(.97)` à l'appui, transitions nommées (jamais `all`).
  - Le délai de 10 minutes s'écoule de façon linéaire, parce que c'est un mouvement constant.
- **Skill `apple-design`.** Il a fixé la symétrie, un libellé direct et précis (« Valider et envoyer », « Annuler l'envoi »), l'interstice de tracking des titres et la retenue.
- **Skill `ecc:make-interfaces-feel-better`.** Il a apporté `text-wrap: balance` et `pretty`, les chiffres tabulaires, des cibles de 44 px au doigt, une bordure plutôt qu'une ombre, et aucun `transition: all`.
- **Skills `ui-ux-pro-max:ui-ux-pro-max`, `design-system`, `ui-styling` et `brand`.**
  - J'ai lancé la recherche `--design-system` (« SaaS operations console approval queue »). J'en ai retenu deux règles :
    - une donnée « en direct » doit porter sa source et l'heure de sa mise à jour : c'est le « dernière synchronisation » et le « vérifié le » de Connexions ;
    - pour les actions par lot : une colonne de cases plus une barre d'action.
  - J'ai rejeté sa palette vert et bleu nuit et ses polices Fira : la marque l'emporte.
  - Les jetons sont posés en trois couches (primitives, sens, composant). La voix est calme et précise, au service de l'artisan, sans aucune promesse.
- **Skill `design:design-critique`.** La critique a été faite par un sous-agent distinct, qui ne connaissait pas mes choix. Elle est détaillée plus bas, avec ce qu'elle a changé.
- **Skill `design:accessibility-review`.** J'ai fait la revue WCAG 2.1 AA, puis j'ai ajouté ses contrôles au juge (cibles tactiles, icônes masquées aux lecteurs d'écran).
- **`CLAUDE.md`, `.claude/rules/*.md`, `.orchestre/contexte.md`.**
  - L'interface ne fait que l'interface (n8n-first) et marque son propre nom seulement dans la console.
  - Aucun « Presti » dans ce que reçoit le client : les aperçus sont « signé Atelier Roux » (`lib/email.ts:6-11`).
  - Aucune donnée réelle, aucun prix deviné présenté comme sûr.
- **Le code existant, lu sans être touché :**
  - `app/crm/page.tsx` : ses sept onglets sont gardés, et son bandeau d'exemple « un plombier imaginaire » est repris ;
  - `app/crm/atelier/` : la vue 3D est conservée, montrée en schéma ;
  - `lib/plans.ts` : les capacités `plateforme.ia.auto`, `relances.auto`, `factures.relances.auto` et `assistant.pilote` sont portées en `data-capacite` sur chaque verrou de Studio ; le verrou passe par `peut()`, jamais par l'offre en dur.

## Les cinq écrans

Dossier : `plans/011-cadrage-01-11/p6-signature/maquettes/`. HTML statique, une feuille commune `maquettes.css` (polices de la marque intégrées en base64 pour un rendu hors ligne). Tout est en données d'exemple, avec un bandeau « Maquette · données d'exemple ». Le compte s'appelle « Exemple. Atelier Roux » et tous les clients « Exemple. … ».

| Écran | Fichier | Ce qu'il montre | Captures (prises par le juge) |
|---|---|---|---|
| Centre de commande (Studio) | `centre-de-commande.html` | La barre du jour (6 à valider et trois priorités à liseré par nature, B12). La page du matin : l'argent d'abord, avec sa source et son heure, « où vous perdez de l'argent » (A16), et une fin sur « Aller aux 6 cartes » (A7). « À valider » : cases, un feu vert par ligne, « Tout valider (4) », un lot avec qui reçoit et qui est exclu (A5, A19, C9). « Hors norme, déjà préparé » : une contestation dont les relances sont arrêtées, une ligne sans tarif marquée « estimé » qui ne part qu'avec le prix de l'artisan (A6). Le rail « Vos assistants » : une question à la fois, la conversation, les récents (prompt 3, écran 1). Une alerte « Google Drive à reconnecter ». | `captures/centre-de-commande-1440.png`, `-390.png` |
| Ce que vos assistants ont fait (Signature) | `ce-qui-a-ete-fait.html` | Le coût de l'IA du jour, avec son plafond, son total du mois et sa source (D3). Les envois seuls (4 sur 20). Le bandeau « Part dans quelques minutes » : la règle graduée du délai, « Annuler l'envoi », « Modifier avant départ ». Les colonnes Repéré, Préparé, À valider et Parti (B5), avec une ligne « fait : … » sous chaque carte (B4), un bouton manuel sur tout ce qui n'est pas parti (B3) et le lien vers le journal sur tout ce qui est parti. « Tout mettre en pause ». | `captures/ce-qui-a-ete-fait-1440.png`, `-390.png` |
| Connexions | `connexions.html` | Les 19 outils d'`OUTILLAGE.md` § 5, rangés en Boîte mail, Agenda, Documents et tableurs, Avis, Messageries, Réseaux, Paiements et Équipe. Chaque outil porte son état (Connecté, À reconnecter, Non branché). Un outil connecté affiche sa « dernière synchronisation » et son « vérifié le … · lecture réussie » (C4), avec « Retirer » ; la confirmation du retrait s'ouvre dans la ligne. Un outil non branché dit « Connecter » et n'affiche aucune date. | `captures/connexions-1440.png`, `-390.png` |
| Mes départements (Signature et Studio) | `departements.html`, vues `#signature` et `#studio` | En tête : l'interrupteur général, le plafond du jour (20, modifiable ; 4 aujourd'hui) et le délai de 10 min. Sept départements, chacun avec son interrupteur. Pour chaque type : « À valider » ou « Part seul » et le compteur du jour. Les gestes « Toujours à vous » sont verrouillés dans les deux offres. Les types pas encore ouverts disent « Bientôt, après essais ». En Studio, tout est « À valider », « Part seul » est désactivé, et le verrou porte sa capacité (`data-capacite`). | `captures/departements-1440.png`, `-390.png`, `departements-studio-1440.png`, `-390.png` |
| CRM « atelier » (Studio) | `crm-atelier.html` | Les sept onglets existants. Les chiffres avec « lu dans … le … » ou « déclaré, pas encore mesuré » (C3). La vue atelier 3D existante, montrée en schéma. La fiche client : statut, prochaine action recommandée avec son feu vert et son bouton manuel, devis, factures, documents et notes liés, historique avec ses « fait : … » et ses liens vers le journal. Le panneau « Une question à la fois » : la réponse donnée, ce qu'elle a mis à jour, « Question 2 sur 3 » (B4). L'import d'un export en trois temps, Lire, Vérifier l'aperçu, Valider : nouvelles fiches, fusions, lignes à vérifier, doublons ignorés, et rien n'est écrit avant la validation (B10). | `captures/crm-atelier-1440.png`, `-390.png` |

Le mouvement :
- une seule entrée des listes au chargement ;
- l'appui sur un bouton ;
- l'écoulement du délai d'annulation.

En mouvement réduit, plus rien ne bouge et tout reste visible : le juge le vérifie sur chaque élément et chaque pseudo-élément. Les contrastes sont en WCAG AA sur chaque texte visible, mesurés dans le navigateur. Aucun défilement horizontal à 390 px.

## La critique de design, et ce qu'elle a changé

J'ai d'abord fait ma propre critique sur les premières captures. Elle a relevé trois défauts :
- la ligne « fait : … » se découpait en colonnes (flex) : elle passe en bloc ;
- la mono rendait mal « 7 h 52 » et « 3 120 € » : la mono est réservée aux grands chiffres ;
- la barre latérale s'arrêtait à mi-page : son fond passe par la coque.

Puis la critique formelle (`design:design-critique`), faite par un **sous-agent distinct**, qui avait les directives mais pas mes choix. Elle a trouvé 14 défauts. Voici ce qui a été corrigé :

| Défaut relevé | Avant | Après |
|---|---|---|
| **Données incohérentes entre écrans (bloquant)** | Exemple. Martin avait à la fois un devis « à envoyer » et un devis relancé. Exemple. Bernard figurait dans les devis sans réponse alors qu'il avait signé. L'acompte de 30 % sur 4 960 € était de 1 280 €. Le « jeudi 6/11 » tombait un vendredi. « Reste 1 720 € » ne collait pas aux factures. Des envois partis seuls appartenaient à des types réglés « à valider ». Le CRM se disait « lu dans » un import non validé. | Le devis à envoyer est celui d'Exemple. Girard (2 480 €). Le lot de relances compte 4 devis (6 190 €) et la page du matin 8 670 €. L'acompte est de 1 488 €. Le rendez-vous est le jeudi 5/11 (vérifié avec `date`). Il reste 2 988 € à encaisser sur 3 factures. Les types partis seuls sont réglés « part seul » et les compteurs du jour font 4. Les chiffres du CRM sont lus dans les devis et les fiches. Le devis Leroy affiche « prix à fixer ». |
| Compteur « À valider » faux | « 4 » partout | 6 en Studio (4 lignes et 2 exceptions), 2 en Signature, et le compteur bascule avec la vue Studio |
| L'envoi en délai rangé dans « Parti » | une carte dans la colonne Parti | un bandeau « Part dans quelques minutes » au-dessus des colonnes ; sur mobile, l'ordre devient À valider, Parti, Préparé, Repéré |
| Trop de corail | interrupteurs, « Part seul » et jauges en corail | ivoire sur noir ; le corail reste à l'urgent, au délai d'annulation, au compteur et à « Annuler l'envoi » |
| Du vert hors « validé » | « Branché », « nouvelle fiche » et l'étape faite de l'import en vert | pastilles neutres, « Connecté », étape faite en ivoire : le vert ne sert plus qu'au feu vert |
| Quatre boutons en escalier, geste manuel sans bordure | colonne de droite étroite qui écrasait le lot | une rangée sous le contenu : le feu vert, puis le geste manuel **bordé**, puis Modifier et Écarter |
| Barre du jour trop haute | une carte « 4 » de 300 px | un chiffre en ligne ; la carte entière est cliquable et le titre porte le lien |
| Départements mal alignés | sélecteurs en escalier, plafond figé | colonnes fixes (196 et 200 px), plafond « 20 par jour » avec « Modifier » à part du compteur |
| Vue Studio | « Part seul : inclus dans Signature » sur des types pas encore ouverts, alors que Signature disait « Bientôt » | « Bientôt, après essais » dans les deux vues ; pastille « Studio » ; option désactivée sans le barré |
| Libellés | « par le modèle », « Journal J-20477 », « Ranger un motif », « Lot du lundi » un mardi, « Votre assistant » | « par vos assistants », « Voir le détail », « Indiquer pourquoi », « Lot préparé lundi », « Vos assistants » ; le compteur des questions passe en sans |
| Contradiction sur la ligne Leroy | « il ne part pas avec une estimation » à côté de « marquée estimé » | « Une estimation est proposée, marquée « estimé » ; le devis ne part qu'avec votre prix » (p6 A13) |
| Le même client répondu de trois façons | le même client, trois réponses différentes | une seule réponse et une seule ligne « fait » dans le centre, le panneau et l'historique ; la prochaine action du CRM devient la commande de la crédence, et ne doublonne plus la question |
| Mobile | titre en double, « » » seul en début de ligne, barre du bas en 11,5 px | la marque dans la barre du haut, des espaces insécables dans les guillemets, une barre du bas en 12 px |
| Drive « à reconnecter » absent de l'accueil | — | une alerte au centre de commande, avec « Reconnecter » |

Ce que je n'ai pas repris, et pourquoi :
- **Les liserés ambre et rouge des priorités** restent. Ils viennent de la piste A « Instrument », que Benj a validée (corail : à répondre ; ambre : à relancer ; rouge : en retard). Ce sont les couleurs d'alerte du système, pas un second accent.
- **Le bouton « Connecter l'envoi automatique » du SMS et le « Connecter » de la fiche Google** restent, parce que la tâche exige que chaque outil de la matrice dise « Connecter ». Le SMS est désactivé (`aria-disabled`) et explique pourquoi (décision 4). La fiche Google dit que l'accès s'ouvre sur demande (décision 3). En code (036-011), les drapeaux `smsClients` et `connexions` baissés les cacheront, comme le veut la règle « une fonctionnalité non finie n'apparaît pas ».

Puis la revue d'accessibilité (`design:accessibility-review`), automatisée dans le navigateur à 390 px. Contraste, noms accessibles, champs étiquetés, `lang`, un seul `h1` et `main` étaient déjà bons. Elle a relevé, et j'ai corrigé :
- **Cibles tactiles sous 44 px** (34 px) : 44 px au doigt pour tous les boutons ; l'interrupteur reçoit une zone élargie ; la carte de priorité devient entièrement cliquable.
- **Icônes annoncées aux lecteurs d'écran** : `aria-hidden` sur chaque icône.
- **Interrupteur peu visible à l'arrêt** (1.4.11) : un contour de 40 % d'ivoire.
- **Option « à valider » choisie mal distinguée** : graisse 600 et contour.

Ces contrôles sont entrés dans le juge, avec leur mutant.

## Le juge `scripts/maquettes-p6-qa.mjs`, et ses mutants

Le juge rend lui-même chaque maquette dans un Chromium sans écran (Playwright), servi sur `127.0.0.1`. Toute autre requête est bloquée. Il lit le DOM rendu, jamais un texte qu'il aurait écrit.

Pour les contrôles, il ouvre les pages en mouvement réduit, à 390 et 1440 px. Pour les captures, il les ouvre en mouvement normal, la fenêtre portée à la hauteur de la page pour que la barre fixe du bas reste en bas. Il vérifie ensuite que chaque capture existe, est un PNG et a la bonne largeur.

Puis il rejoue tout sur une copie mutée pour chaque mutant. Il exige le refus attendu. Une mutation dont le motif est introuvable compte comme un échec : c'est arrivé une fois, quand « 7 lignes » était devenu « 6 lignes », et le motif est maintenant strict.

Sortie de `node scripts/maquettes-p6-qa.mjs` (38 s) :

```
✓ maquettes : 5 écrans, 6 vues × 390 et 1440 px, 12 captures, tous les contrôles verts
  ✓ mutant refusé : un écran manquant (Connexions)
  ✓ mutant refusé : l'écran CRM manquant
  ✓ mutant refusé : « Part seul » actif en Studio
  ✓ mutant refusé : un « Envoyé » sans journal
  ✓ mutant refusé : une action partie sans son entrée de journal
  ✓ mutant refusé : le mot interdit « garanti »
  ✓ mutant refusé : le mot interdit « 100 % »
  ✓ mutant refusé : du jargon (« agent ») devant l'artisan
  ✓ mutant refusé : « Presti » dans un message au client
  ✓ mutant refusé : une capture manquante
  ✓ mutant refusé : une animation sans repli en mouvement réduit
  ✓ mutant refusé : deux questions posées à la fois
  ✓ mutant refusé : une action sans sa ligne « fait : … »
  ✓ mutant refusé : une action sans bouton manuel
  ✓ mutant refusé : un outil de la matrice absent (Teams)
  ✓ mutant refusé : une fausse synchronisation sur un outil non branché
  ✓ mutant refusé : une cible tactile trop petite à 390 px
  ✓ mutant refusé : un texte trop pâle (contraste)
✓ mutants : 18/18 refusés
```

Les dix mutants exigés par la tâche sont tous là :
- un écran manquant ;
- « Part seul » actif en Studio ;
- un « Envoyé » sans journal ;
- un mot interdit, « garanti » puis « 100 % » ;
- une capture manquante ;
- une animation sans repli ;
- le CRM manquant ;
- deux questions à la fois ;
- une action sans « fait : … » ;
- un outil de la matrice absent.

J'en ai ajouté sept : le jargon, « Presti » chez le client, le bouton manuel, la fausse synchronisation, la cible tactile, le contraste, et une action partie sans entrée de journal.

Ce juge vérifie des maquettes, pas le produit. Un vert prouve seulement ce que ses assertions regardent :
- les écrans, attributs et textes ;
- les contrastes mesurés ;
- le mouvement réduit ;
- les captures.

Le juge n'est pas encore dans `SUITES` (`scripts/tout-verifier.mjs`), qui est hors de mon périmètre. C'est à 036-012 de l'y mettre, ou de le déclarer dans `HORS_LANCEUR`, parce qu'il exige Chromium.

## Ce que ce lot n'a pas fait (gestes réservés et périmètre)

- Aucun fichier touché dans `app/`, `lib/`, `supabase/` ni dans un workflow n8n. Ni build, ni typecheck, ni commit, ni push, ni migration. Rien n'est écrit dans le vault.
- Les écrans refusés de 032-041 et 032-046 n'ont pas servi de modèle.
- Les maquettes n'envoient rien et ne lisent aucune donnée. Ce sont des fichiers statiques.
- Prochaine étape : 036-011 (l'interface en code, drapeau `systemeAgents` baissé) part de ces maquettes après le regard de Benj. À reporter dans le code :
  - le renommage « Pipeline » → « Suivi des devis » (p3:593) ;
  - la règle « le vert ne dit que validé » ;
  - les attributs `data-*` qui ont servi au juge, réutilisables par `scripts/interface-p6-qa.mjs`.
