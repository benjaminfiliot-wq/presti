# Journal-Decisions


## 2026-09-24 — Écosystème d'agents : tout construire en parallèle, Benj seul à démarcher, garde-fous posés

**Contexte.** Le 24/09, Benj fixe l'objectif final de Presti : une automatisation totale. Lui ne fait que regarder l'argent rentrer et prendre les appels (voir [[Ecosysteme-Veille-2026-09-24]]). Le plan [[Ecosysteme-Plan-2026-09-24]] recommandait de prouver le message à la main jusqu'au 08/10 avant de construire la machine 24 h/24 : les ~220 contacts froids du 09 au 16/09 ont donné 0 intéressé.

**Décisions de Benj (24/09, en réponse aux questions de Claude Code).**
- **Stratégie : tout construire en parallèle.**
  - La phase 1 (réparations, maquettes offertes) ET la machine 24 h/24 (agents, bus, Pilotage), comme dans les sources envoyées.
  - Benj regarde et prévient ; Claude Code continue à se renseigner.
- **Vercel :** l'offre Hobby interdit l'usage commercial (conditions du 14/09/2026). Benj demande d'abord une alternative avant de payer Pro (20 $/mois).
- **Équipe :** Gabriel et Louis-Victor ne travaillent plus pour Benj. Benj est le seul envoyeur ; la question de leur statut (D1, D2) disparaît.
- **Garde-fous (D3) et sauvegarde (D4) :** oui, posés par Claude Code lui-même, y compris le dépôt de sauvegarde.
- **Modèles :** le chef d'opérations tourne sur GPT-6 sol, les cycles légers sur GPT-6 luna.
- **Pubs :** ElevenLabs Creative, déjà connecté, plutôt qu'Alexya, qui ne sert que si elle devient indispensable.

**Conséquence.** Les fiches 025 (phase 1) et une série 026 (machine 24 h/24) sont menées de front. Les envois restent faits à la main par Benj tant qu'aucune API ne permet de les automatiser dans les règles.

---

## 2026-09-14 — Performance : la police de texte en `optional` (v16)

**Contexte.** Le 2026-09-14, le premier verdict de la tâche 016-02 a échoué sur la démo « Atelier Lestraque » avec un Lighthouse mobile à 92 sur l'accueil, et un premier correctif visant le script (`site.js`) n'a rien stabilisé (91 · 95 · 97 au repos). La trace du fil principal (Playwright + CDP, mobile, CPU ×4) a montré que les longues tâches étaient de la mise en page, pas du script : la première passe d'une page longue, puis une seconde complète à l'arrivée de la police de texte, aggravée par `text-wrap: balance` sur tous les h3.

**Décision.** Tracer avant de corriger : `text-wrap: balance` est réservé aux h1/h2 et la police de texte passe en `font-display: optional` (la police de titre reste `swap` et préchargée).

**Conséquence.** Lighthouse mobile de l'accueil Lestraque à 97 · 97 · 97 au repos (CLS 0,016 → 0), 016-02 rejugée PASS (site-qa + grille-qa + code-qa), et le traceur rangé dans `scripts/trace-longues-taches.mjs`.

---

## 2026-09-14 — La chaîne qui pousse s'arrête au premier échec (v16)

**Contexte.** Le 2026-09-14, la chaîne de fond enchaînait le verdict de 016-02, la compilation, le commit et la poussée sans s'arrêter sur le verdict — qui est tombé FAIL (Lighthouse mobile 92). Elle aurait mis en ligne le bloc de la landing avec une démo refusée ; elle a été arrêtée avant la poussée (rien n'était parti, `HEAD` = `origin/main`).

**Décision.** Toute chaîne qui aboutit à une poussée s'arrête au premier verdict FAIL : les étapes se lient par `&&`, jamais par `;`.

**Conséquence.** La landing n'a été poussée qu'après le PASS de 016-02 (commit ca5d62c, déploiement READY), puis jugée en production par 016-03 : PASS (la capture animée joue sur bureau et mobile, la page de la démo et sa feuille de style répondent en 200).

---

## 2026-09-14 — La révélation « brut → fini » comme geste signature de la démo (v16)

**Contexte.** Le 2026-09-14, après deux passes de la grille, seul C1 restait à 4 contre une médiane de 5 : « l'objet du héros est toujours une photo fixe, même bien éclairée ». Un premier essai de révélation montrait par endroits une tache brune floue sur l'outil, et le juge signalait deux animations ambiantes superposées sur la même photo.

**Décision.** Un seul geste signature sur le héros, bureau seulement : un cercle de lumière laisse voir l'escalier fini dans la photo du rabot (escalier posé à droite, cercle plus grand et plus net), et le balayage de lumière se retire quand la révélation est là.

**Conséquence.** Troisième passe : PASS sur les huit critères (C1 5 · C2 5 · C3 5 · C4 4 · C5 3 · C6 5 · C7 5 · C8 4 contre les médianes 5 · 4 · 3 · 4 · 2 · 4 · 3 · 4), le juge notant C7 en hausse pour « un seul geste signature » ; la marge la plus fine reste C5. Détail des gestes : [[Produit/Cerveau-site-v2]].

---

## 2026-09-14 — Une seule démo, jugée sur une grille par un juge indépendant (v16)

**Contexte.** Le prompt v16 de Benj demande UNE démo de site au niveau MotionSites, qui finisse sur la landing, validée sans lui. Le 2026-09-14, « Atelier Lestraque » (menuisier-agenceur fictif à Rennes, 0 résultat au registre des entreprises, onze photos Commons à provenance prouvée) passait tout `site-qa` et échouait pourtant la grille : C1 4, C2 2, C8 2, parce qu'un balayage de lumière écrit en CSS ne se voyait sur aucune image-clé.

**Décision.** La démo est validée par `site-qa` + `grille-qa` (démo ≥ médiane des références sur C1–C8) + `code-qa`, et la grille est notée par un sous-agent qui n'a pas construit la démo, n'a pas lu les notes antérieures et re-note lui-même les neuf références.

**Conséquence.** Un geste écrit n'est plus un geste vu tant que les images-clés ne le montrent pas ; tout changement après un PASS annule la note, d'où trois passes le 2026-09-14, la troisième donnant le PASS, avant le bloc « Et le site qui va avec » sur la landing (« Le site, à la demande — 300 €, une fois. »).

---

## 2026-09-14 — Budget : la part lue ne compte que les jetons neufs (v16)

**Contexte.** La commande `budget` de l'orchestre lit les transcripts Claude Code pour dire quelle part des jetons est lue plutôt que produite, et alerter au-delà de 60 %. Sa première version comptait la relecture du cache — la conversation relue à chaque tour — et affichait donc 100 % en permanence : une alerte toujours rouge n'alerte plus.

**Décision.** La part lue ne compte que ce qui entre de neuf (fichiers, sorties d'outils) face à ce qui est produit ; la relecture du cache est montrée à part.

**Conséquence.** Mesure réelle de la grande session Presti du 2026-09-14 : 89 %, alerte rouge — juste, cette session lisait beaucoup trop elle-même ; le bloc budget s'écrit en tête du digest. Voir [[Produit/Orchestre]].

---

## 2026-09-14 — L'orchestre devient un outil à part (v16)

**Contexte.** Le prompt v16 demande un système universel qui tourne sans Benj et sans vider Claude Code. L'orchestre v15 (`scripts/orchestre.mjs`) était lié aux chemins de Presti, sans mesure de budget ni hook.

**Décision.** L'orchestre vit dans son propre dépôt Git, `C:\Users\benja\Documents\orchestre` (`bin/orchestre.mjs` piloté par `.orchestre/orchestre.json` ; `init`, `maj`, `budget` ; hooks `read-garde` et `contexte-fond` ; gabarits CLAUDE.md avec le routage des modèles, AGENTS.md, tache.md, decisions.md ; juges `code-qa`, `site-qa`, `video-qa` ; preuve `test/preuve.mjs`), et Presti n'en est qu'une installation (`--vault=../SaaS`).

**Conséquence.** Le prochain projet démarre par un `orchestre init` ; dans Presti, `scripts/orchestre.mjs` est une copie tenue à jour par `maj` et ne s'édite plus à la main, les règles propres au projet vivant dans `orchestre.json`. Voir [[Produit/Orchestre]].

---

## 2026-09-14 — Ne rien payer sans Benj : MotionSites et Design Rocket (v16)

**Contexte.** Pour fixer le « niveau MotionSites », 55 prompts MotionSites ont été relevés en métadonnées sans consommer d'ouverture, mais les deux candidats pour les ouvertures restantes sont premium. Sur Design Rocket, le compte de Benj est en Free Plan et tout le contenu est derrière « Upgrade to Pro » — et un agent avait écrit des « principes Design Rocket » sans en avoir lu une leçon.

**Décision.** Aucun abonnement, déblocage ni bouton payant sans Benj : le niveau se fixe sur les aperçus publics (neuf aperçus animés réduits en images-clés, `planche-refs.jpg`, synthèse en six points, grille C1–C8), et les principes non sourcés sont retirés.

**Conséquence.** Rien n'a été lu ni payé sur Design Rocket le 2026-09-14 ; prendre MotionSites Unlimited et/ou Design Rocket Pro reste la question H1 de Benj (v16 §6), avec H2 (laisser Chrome connecté aux deux sites) et H3 (la démo en ligne, facultatif).

---

## 2026-09-14 — Démos : un générateur déterministe plutôt que des agents

**Contexte.** Le 2026-09-14, après avoir commencé ses appels aux artisans, Benj a jugé les neuf sites de démonstration v1 (plombier, électricien, chauffagiste, maçon, menuisier, peintre, carreleur, couvreur, serrurier), livrés par des agents Antigravity dans la nuit, « très nulles, pires que ce qu'on avance via le site » — alors que le juge `scripts/site-qa.mjs` les disait verts. Trois causes : le juge mesurait la substance (texte, photos, CSS, polices, Lighthouse) et pas le design ; la règle « animations retenues » du cerveau v1 interdisait le geste ; et les agents, sans direction artistique chiffrée, rendaient le thème par défaut, en plus de dépendre de quotas qui tombent en minutes.

**Décision (Claude Code, en réponse au verdict de Benj sur la v1 ; les sites v2 restent à lui montrer).** Les démos sont rendues par `public/sites-demo/generer.mjs`, un générateur déterministe — sans aucun modèle de langage — depuis `contenu.json` (les textes v1, déjà jugés), `attributions.json` et `site.json`, porté par un kit d'animation `public/sites-demo/_kit/` (kit.css, kit.js, `da.json` = direction artistique par métier) et une grammaire écrite en valeurs exactes dans `plans/cerveau-site-motifs.md`.

**Conséquence.** Les neuf sites sortent identiques à chaque fois, 9/9 verts au juge complet le 2026-09-14 (Lighthouse mobile Performance 96–100, Accessibilité 96–100, LCP 1,4–2,5 s), avec trois gestes de héros (plein cadre : plombier, chauffagiste, couvreur ; scindé : électricien, maçon, menuisier, carreleur, serrurier ; aplat : peintre) ; un nouveau métier coûte une ligne dans `da.json`, pas un agent. Détail : [[Produit/Cerveau-site-v2]].

---

## 2026-09-14 — Photos : la provenance se prouve, elle ne se déclare pas

**Contexte.** En ouvrant les démos v1 le 2026-09-14, 26 photos sur 53 portaient une attribution inventée : fichier Commons inexistant, photo différente de celle citée, ou — pour le carreleur — un générateur d'agent (`public/sites-demo/build.mjs`, jamais commité, supprimé depuis) qui téléchargeait des images Picsum en leur collant un auteur et une licence Commons fictifs. Un site vendu avec des crédits photo faux ment sur sa page de mentions légales.

**Décision.** Une attribution plausible ne vaut rien : les photos se prennent par `scripts/photos-demo.mjs` (`chercher` → planche numérotée choisie à l'œil, `prendre` → téléchargement Commons, attribution recopiée de l'API) et se prouvent par `scripts/photos-provenance.mjs` (comparaison de l'image locale à la vignette Commons par empreinte perceptuelle, et de l'auteur à l'API).

**Conséquence.** Toutes les photos des neuf démos ont été re-sourcées : 56 photos, 0 fausse attribution ; la règle est inscrite au §7 (anti-fabrication) de `plans/cerveau-site.md`.

---

## 2026-09-14 — Le juge mesure le geste

**Contexte.** Le juge des sites, `scripts/site-qa.mjs`, validait des sites propres et sans caractère : il mesurait ce qui est écrit et chargé, pas le mouvement. C'est ce qui a laissé passer les démos v1 jusqu'au verdict de Benj.

**Décision.** Le juge gagne un bloc « Le geste » — h1 en mots (≥ 3 `.mot`), ≥ 12 `.reveal`, rideau, bande qui défile, galerie, panneau d'étapes, accordéon, ≥ 8 `:hover` et un `cubic-bezier`, `prefers-reduced-motion` traité, rien qui anime la mise en page — plus trois mesures au rendu réel (h1 ≥ 56 px, contenu masqué puis dévoilé en entier au défilement sur bureau et mobile, tout visible sans défiler en mouvement réduit).

**Conséquence.** Un site v1 propre ne passe plus ; le juge a aussi corrigé deux défauts de lui-même le 2026-09-14 (le h1 est lu sans ses balises, la mesure de rendu attend le rideau), et un juge de performance se lance machine au repos — les mesures prises pendant une suite Playwright sur la même machine étaient fausses de 100 à 150 ms.

---

## 2026-09-14 — Poussé n'est pas déployé

**Contexte.** Le 2026-09-14, en cherchant pourquoi la suspension d'un compte restait sans effet en production, l'API Vercel a montré 37 déploiements de production en ERROR à la suite depuis le 2026-09-13 à 17 h 57 UTC : `useSearchParams()` sans frontière Suspense dans `app/site/commander/page.tsx` faisait échouer le prérendu, donc tout le build. Rien de ce qui avait été poussé pendant la nuit (site à la demande, correctif de suspension, corpus urgence) n'était en ligne, et personne ne l'avait vu — un `git push` réussi se lisait comme un déploiement réussi.

**Décision.** Après chaque push sur `main`, `node scripts/deploiement-etat.mjs` (état des derniers déploiements, première ligne d'erreur, code 1 si le dernier n'est pas READY) ; avant de pousser une page client, `next build` en local ; une suite e2e « en production » vérifie d'abord que la production sert le commit qu'elle croit tester.

**Conséquence.** Corrigé et déployé le 2026-09-14 (commit 1e3884d READY à 09 h 25 UTC) ; les suites suspension-e2e (29/29) et site-commander-e2e (18/18) passent en production, et la garde de connexion lit la suspension par `lib/suspension.ts` (requête directe, fail-closed) après deux échecs silencieux de l'imbrication PostgREST (PGRST201).

---

## 2026-09-14 — Un second exécutant gratuit à côté d'Antigravity

**Contexte.** Le pilote `scripts/antigravity.mjs` lance n'importe quel modèle du catalogue (Gemini 3.8 / 3.7 Flash, Claude Opus 4.6, Sonnet 4.6…), mais les quotas mesurés dans la nuit du 13 au 14/09 tombent en quelques minutes dès que plus de deux agents tournent, et les retours se font par vagues ; Gemini 3.8 et 3.7 Flash ont livré des sites verts, Opus et Sonnet n'ont jamais survécu au quota. Benj a demandé une autre IA gratuite pour ne plus dépendre de ces quotas.

**Décision.** `scripts/executant.mjs` pilote Gemini CLI (`npx @google/gemini-cli`) ou Qwen Code (`npx @qwen-code/qwen-code`), gratuits, avec le même prompt de tâche que le pilote Antigravity (importé, une seule source) ; commandes `sonde`, `lancer`, `pas`, `etat`, même registre « un agent, une tâche ».

**Conséquence.** Les deux CLI tournent ; il manque une connexion que seul Benj peut faire, une fois, dans un terminal (Login with Google et accepter le dossier comme fiable, ou `/auth` → Qwen OAuth). Voir [[Produit/Antigravity]].

---

## 2026-09-14 — Méthode duo : Claude Code dirige, l'exécutant fait un pas à la fois

**Contexte.** Proposée par Benj le 2026-09-14 à 4 h 40 : « au lieu de lui donner des tâches, travaille avec lui : c'est toi le dirigeant, mais tu participes ». La nuit avait montré qu'une tâche confiée d'un bloc coûte à l'agent des dizaines d'essais (quota) et à Claude Code des relectures et des reconstitutions (tokens) — dont trois jours de travail non commité effacés par un `git restore` d'agent, reconstitués depuis les transcripts (interdit absolu de `git restore/checkout/stash/reset/clean` dans le pied de chaque tâche, et commit avant toute flotte, décidés dès le soir du 13/09 après l'incident).

**Décision.** Une conversation par tâche, un pas à la fois dicté par Claude Code, le juge entre les pas (`site-qa.mjs --statique` entre les pas, complet à la fin), deux conversations au plus en même temps, jamais de rafale ; écrit dans `plans/duo-antigravity.md`, drapeau `--duo` du pilote.

**Conséquence.** Claude Code écrit six messages de trois lignes et lit six lignes de verdict au lieu d'une tâche de soixante lignes ; le vrai duo pas à pas reste à exercer sur une tâche neuve — le premier essai (plombier) a reçu le prompt ordinaire parce que le drapeau n'était pas lu (corrigé).

---

## 2026-09-14 — Postage réalisé : les dix publications sont parues

**Contexte.** Benj avait dit « poste-les toi-même, ne me demande pas l'autorisation ». Publora (formule Starter) ne tient que trois parutions programmées à la fois sur un horizon de sept jours, d'où une tâche planifiée Windows « Presti publications » qui relançait le pipeline toutes les six heures.

**Décision.** Le 2026-09-14, tout est parti : les trois parutions programmées publiées « maintenant » depuis le tableau de bord Publora, les sept autres par le pipeline (créneau passé → publication immédiate), pub-03 exclue (postée à la main par Benj).

**Conséquence.** Publora : 10 publiées, 0 échec (LinkedIn, Facebook, Instagram) ; la tâche planifiée « Presti publications » est retirée, plus rien à programmer. Détail : [[Prospection/Publications-Presti-2026-09]].

---

## 2026-09-13 — Site à la demande : le livrable est un dossier statique (v15, étapes 2-7)

**Décision (Claude Code, architecture — §1.1 du prompt v15).** Un site généré est un **dossier statique** — HTML, CSS, un peu de JS, images WebP/AVIF, `sitemap.xml`, `robots.txt`, et un `site.json` qui déclare le métier, les communes réellement servies, les métiers secondaires, le SIREN, la décennale et la liste des pages typées. Ce n'est pas un rendu du moteur `/site/[slug]`.

**Pourquoi.** (1) Il est **jugeable hors de l'application** : `presti/scripts/site-qa.mjs` sert le dossier lui-même et lance Lighthouse mobile dessus — aucun site ne passe à `generee` sans ses quatre scores ≥ 95. (2) Il est **produisible par n'importe quel exécutant** (Antigravity, une tâche par métier) sans toucher au code de l'app ni à la base. (3) Il est **portable** : la proposition H3 (« il reste en ligne 12 mois puis export statique offert ») ne coûte rien, l'export EST le site. (4) Le `site.json` rend le mensonge impossible à cacher : une page pour une commune non déclarée est refusée comme page satellite.

**Hébergement prévu (étape 6).** Le dossier validé est déposé dans un bucket Supabase `sites/<commande>/` et servi par une route Next de diffusion (content-types stricts, cache long), le domaine de l'artisan étant réécrit vers elle par `middleware.ts` comme les domaines perso aujourd'hui. Le moteur `/site/[slug]` continue de servir les sites d'origine `abonnement`, sans changement (§2.2 : rien ne disparaît).

**Ce que ça exclut.** Un site généré ne dépend d'aucune table à l'exécution ; la page de conversation Presti y est un **lien** (« Demander un devis » → la plateforme de l'artisan), pas un composant embarqué. Voir [[Produit/Antigravity]] pour la méthode, `presti/.orchestre/digest.md` pour l'état.

## 2026-09-09 — Gabriel prospecte et répond avec Benj — à cadrer par écrit
- **Dit par Benj le 09/09 :** « c'est Gabriel qui s'occupe de démarcher et répondre avec moi ».
  La distribution a donc des bras. L'entrée ci-dessous, écrite la veille, la disait sans titulaire :
  elle est datée, pas fausse — c'est l'état qui a changé.
- **Précisé par Benj le 09/09 :** Gabriel « est avec LV » — donc **deux personnes distinctes**,
  Gabriel et Louis-Victor, qui travaillent ensemble sur la distribution. La
  `Convention-Presti-LouisVictor` (projet du 08/09, non signé, non relu) n'en couvre **qu'une**.
- **Le point à cadrer, et il vaut maintenant pour deux personnes :** quelqu'un qui prospecte
  régulièrement et fait entrer du chiffre **sans statut, sans facture et sans déclaration**, c'est le
  risque de **travail dissimulé** que la convention signale elle-même en première page — et il est à
  la charge de **Benj**, pas à la leur. Un document qui n'en nomme qu'un laisse l'autre entièrement
  à découvert.
- **Accès choisi par Benj : Gabriel travaillera SUR SON COMPTE.** Décision prise, notée telle quelle.
  Ce qu'elle implique, dit une fois : Gabriel agira **en tant que Benj** (aucune trace de qui a fait
  quoi), le partage de compte est contraire aux conditions de Meta, et une connexion depuis un
  nouvel appareil est le déclencheur classique d'un blocage — **la Page tombe avec le profil qui
  l'administre**. L'alternative ne coûte rien : un rôle **Modérateur** sur la Page (répondre aux
  messages et aux commentaires, sans pouvoir modifier la Page ni lancer de publicité), depuis le
  compte de Gabriel. À reproposer si un blocage arrive, pas avant.
- Pas de réponse automatique de messagerie : décision de Benj du 09/09, ce sont des humains qui
  répondent.

---

## 2026-09-08 — La distribution sans titulaire : outillage installé, arbitrage non tranché
- **Ce qui est acté :** Benj s'est donné les moyens de porter la distribution lui-même.
  **Ce qui ne l'est pas :** qui la porte. La `Convention-Presti-LouisVictor` (ci-dessous) vise la
  même case et n'est ni signée ni relue. Tant qu'elle n'est pas tranchée, cette entrée journalise
  un OUTILLAGE, pas une décision d'organisation.
- **Le fait générateur :** la distribution n'a plus de titulaire. C'est la conséquence non dite de l'entrée
  ci-dessous : en retirant les accès d'Alexandre, on a aussi retiré **le seul titulaire du chantier
  acquisition**. Le produit tourne, la distribution non.
- **Pourquoi maintenant :** zéro client apporté, zéro commission versée, donc rien à récupérer et
  rien à attendre. Le chantier ne repart que si Benj s'outille lui-même.
- **Livré (installé le soir même, portée utilisateur) :** deux plugins de skills depuis
  `github.com/sergebulaev` — `linkedin-skills@linkedin-skills` **v1.0.33** (11 skills) et
  `facebook-skills@facebook-skills` **v1.0.18** (8 skills installées, dont **3 réparées à la main** :
  `fb-audience-insights`, `fb-page-optimizer` et `fb-repurposer` ne se chargeaient pas du tout.
  Cause trouvée le 08/09 : leur `description:` YAML n'est **pas entre guillemets** et contient un
  `: ` — le parseur y voit une sous-clé, la description tombe, la skill n'est pas enregistrée.
  Règle vérifiée sur les 19 skills des deux plugins : *non quotée + `: ` = absente*, sans exception.
  Preuve : `claude plugin details` affichait `< 20 tok` always-on pour ces trois-là, il affiche
  `~130` comme les autres depuis. ⚠️ Le correctif vit dans le cache du plugin : **un
  `claude plugin update facebook-skills` l'écrasera**. C'est un défaut amont, à remonter). Installés
  le 08/09 au soir, à 22:00 et 22:03 heure de Paris (20:00:23 et 20:03:56 UTC).
- **Ce que ça coûte : rien.** Les deux fonctionnent en **mode brouillon sans aucune clé API** — le
  post approuvé revient en bloc à copier-coller. Les clés sont **optionnelles et communes aux
  deux** : `PUBLORA_API_KEY` (publication automatique), `LINKEDIN_PLATFORM_ID` /
  `FACEBOOK_PLATFORM_ID`, `APIFY_TOKEN`, `PIXFARO_TOKEN`. Aucune n'est posée.
- **Limite n°1, à dire plutôt qu'à découvrir :** ces skills sont **écrites en anglais**, et leur
  détecteur de tics d'IA repose sur un **vocabulaire anglais** (« leverage », « significant »,
  « streamline », « foster » — `facebook-skills/1.0.18/README.md` l.222), donc inopérant sur un
  texte français. Reste **à vérifier** si les heuristiques d'algorithme (hooks, longueur, horaires)
  valent pour une audience française. La cible de Presti est l'**artisan français** : ce sont des
  outils de rédaction à traduire et à recadrer, pas un pilote automatique.
- **Limite n°2, plus gênante :** le jeu Facebook vise **les Pages** — « Pages only, never personal
  profiles » (`facebook-skills/1.0.18/SKILL.md` l.123) — et **ne traite ni les profils ni les
  groupes**. Or le canal retenu le 2026-08-05 (entrée « Marché tranché » plus bas) est **local :
  FB, forums métier, bouche-à-oreille** ; et l'entrée « PIVOT DE CIBLE » du même jour listait les
  **groupes FB locaux** comme une des trois pistes explicitement laissées **à trancher** (avec
  Google Maps et le démarchage). Le canal reste donc ouvert — [[Profil-Fondateurs]] l.34 l'écrit
  noir sur blanc : « Canal d'acquisition — LA QUESTION OUVERTE » — mais si les groupes l'emportent,
  ces skills ne les couvrent pas. Et **LinkedIn n'est pas le canal décidé le 05/08** : ce sont
  **11 des 19 skills installées** qui visent un réseau hors cap actuel ([[Récap-Projet]] l.70).
- **État réel :** **aucune clé n'est posée** — rien dans les deux caches (seulement des
  `.env.example`) ni dans les réglages Claude — donc **rien ne peut partir en publication
  automatique** ; rien n'a été publié et aucun contenu n'est écrit. L'outillage est posé, la
  distribution n'a pas commencé.
- **Autre piste ouverte le même jour, non tranchée :** [[Récap-Projet]] l.71 pointe
  `Legal/Convention-Presti-LouisVictor` (.docx/.pdf, du 08/09 15:40) — **un projet, non signé et
  non relu**, le document le dit lui-même en tête : « Version du 8 septembre 2026 — projet à faire
  relire avant signature ». Il porte **exactement le chantier laissé sans titulaire** : échange de
  services **sans aucun flux financier**, essai de **trois mois**, volumes plafonnés des deux
  côtés, où Louis-Victor assurerait « création et animation, avec Benjamin, des comptes et contenus
  de Presti (LinkedIn, réseaux sociaux, vidéos), prise de contact avec des artisans, présentation
  du produit, remontée des retours » (art. 3.1), en échange de l'aide de Benj sur le site de son
  propre projet (art. 4). Presti resterait la propriété exclusive de Benj (art. 2.3) et les comptes
  comme les audiences appartiendraient à Presti (art. 7). **Le document alerte lui-même sur quatre
  risques** : le **travail dissimulé** — qu'il qualifie de « risque principal », à la charge de
  Benjamin, et dont il dit des parades retenues « elles réduisent le risque ; elles ne le
  suppriment pas » — l'imposition d'un échange de services (double vente, art. 5), les « certaines
  similitudes » entre le projet de Louis-Victor et Presti (d'où l'annexe A et la non-concurrence de
  l'art. 8), et l'amitié. Il recommande lui-même de basculer vers une commission (art. 11) si
  l'essai fonctionne. **Cette convention et les skills ci-dessus visent la même case** : il faut
  trancher entre les deux, ou les articuler.
  Rien n'est décidé ici — le choix appartient à Benj, et il se journalise quoi qu'il arrive.
- **Reste à faire (Benj) :** **d'abord, trancher entre s'outiller seul et la convention
  Louis-Victor** (ou articuler les deux), puisque les deux répondent au même trou ; puis trancher le
  canal (Page Presti vs groupes locaux vs démarchage direct), décider si Publora vaut une connexion
  de compte, et écrire le premier lot de contenus en français. Boussole : [[Récap-Projet]].

---

## 2026-09-08 — Fin de la collaboration avec Alexandre : tous ses accès retirés
- **Décision (Benj) :** « vire Alexandre de l'entreprise, enlève ses accès privilégiés, je
  travaille plus avec lui étant donné qu'il sert à rien. » Décision prise le jour même où sa
  commission venait d'être rendue variable (entrée ci-dessous) — celle-ci devient sans objet.
- **Ce que son compte portait, mesuré avant d'écrire :** `is_founder`, `role_interne = partenaire`,
  le rôle « lecture » du Poste de contrôle, un code d'apporteur **actif**, **zéro** ligne au
  registre des apports, **zéro** reversement, aucun abonnement Stripe (offre business offerte).
  La sortie ne laisse **aucune dette** : rien n'a été apporté, rien n'a été versé.
- **Retiré, appliqué en production et journalisé** (migration 0084) : les deux colonnes de
  privilège, le rôle du Centre, le code d'apport (désactivé, jamais supprimé — un code qui a
  circulé ne se réattribue pas), et ses sessions (il en avait **une** ouverte).
- **Ce qui reste, volontairement :** ses 11 lignes de journal — une trace ne s'efface pas, c'est
  même pour ces jours-là qu'elle existe — et son compte d'artisan avec ses 5 factures, scellées
  dix ans (art. L. 102 B du LPF). **On retire des droits, on ne réécrit pas le passé.**
- **Le piège de la garde, à retenir :** `garde.ts` calcule `role_interne === 'partenaire' ?
  'partenaire' : 'fondateur'`. Vider le rôle **sans** retirer `is_founder` ne dégrade pas les
  droits : ça les **promeut**. Le repli « rôle inconnu = fondateur » est juste pour un compte de
  Benj sans rôle ; c'est un piège le jour d'un départ. Les deux colonnes tombent ensemble.
- **Angle mort levé :** `zero-demo-e2e` surveillait `is_founder` et `direction_roles`, **pas**
  `role_interne` — alors que c'est lui qui décide du périmètre depuis le v11. Il est surveillé
  désormais, et la liste close est repassée à un seul nom.
- **Vérifié hors base :** Vercel — Benj seul, propriétaire ; aucune variable d'environnement ne
  pointe vers lui. **Reste à faire par Benj** (pas d'identifiants ici) : la redirection OVH
  `[EMAIL_MASQUE]` → son Gmail (plan J1), les membres du projet Supabase, les
  collaborateurs GitHub, l'équipe Stripe.
- **Le rôle « partenaire » reste dans le code** : c'est un rôle, pas une personne, et la matrice
  de droits est éprouvée. On ne supprime pas une serrure parce que le locataire est parti.
- Conséquence sur le duo : voir [[Profil-Fondateurs]].

---

## 2026-09-08 — Commission d'Alexandre VARIABLE (10 à 20 %), décidée par Benj apport par apport
- **Décision (Benj) :** la commission d'apport n'est plus fixe à 20 %. Le contrat pose une
  **fourchette de 10 à 20 %**, et c'est Benj qui tranche, **pour chaque apport**.
- **Pourquoi ça change quelque chose :** le code décidait à sa place (20 % en dur, 10 % si contesté),
  ce qui rendait la fourchette du contrat inapplicable.
- **Livré :** migration 0077 (colonne `taux_pct`, bornée 10-20 en base) + sélecteur dans l'écran
  Apports du Poste de contrôle, journalisé avec l'avant/après. La colonne est **nullable** à
  dessein : NULL = « rien décidé », et le jour d'un désaccord c'est cette différence qu'il faut
  pouvoir montrer.
- **Garde-fou :** un apport **contesté reste plafonné à 10 %** même réglé à 20 — le contrat prime
  sur le réglage, sinon la clause de désaccord ne servirait à rien.
- **Au passage :** un défaut faisait toucher à Alexandre **cent fois moins** que dû (12 centimes au
  lieu de 11,80 € sur un client à 59 €). Corrigé, avec le test qui manquait.
- Détail : [[Session-2026-09-08-Mode-Support-et-Audit-61-Defauts]].

---

## 2026-09-08 — Presti ne regarde plus les données d'un artisan sans son accord
- **Décision (Benj, après avoir demandé « pourquoi tu veux me bloquer la vue ? ») :** on garde la
  fermeture. Benj ne voit plus, **depuis son navigateur**, les devis / factures / demandes des
  autres artisans (il en voyait 9, 12 et 9). Le Poste de contrôle, lui, n'est pas touché.
- **Pourquoi :** cette vue n'était pas attachée à Benj mais à **son jeton de session**. Poste
  ouvert, téléphone perdu, extension véreuse : toute la base clients partait en une requête, sans
  passer par l'app et sans laisser une ligne dans le journal.
- **Ce qui remplace :** le **mode support** — une fenêtre d'une heure sur UN élément que l'artisan
  désigne et ouvre lui-même, où l'on ne lit que la forme, avec deux traces par lecture et un verrou
  définitif possible. Ce n'est **pas** un « voir comme lui » : une session en tant que l'artisan
  produirait des traces attribuées à lui.
- **Conséquence commerciale assumée :** c'est devenu un argument — section « Et nous, on voit
  quoi ? » sur la landing. Tes concurrents peuvent copier la phrase, pas le mécanisme.

---

## 2026-09-08 — Clés Stripe restreintes : NE PAS révoquer
- **Décision (Benj) :** on ne révoque pas les `rk_live_…` du `.env.local`.
- **Vérifié avant d'acter :** `.env.local` **n'est pas suivi par git**, `.gitignore` l'exclut, et
  aucune clé n'a jamais été committée (les occurrences de `rk_live_` dans l'historique sont le
  motif sans suffixe, dans des plans et dans la garde anti-secrets).
- **Donc :** elles n'existent que sur le poste de Benj, au même endroit que toutes ses autres clés.
  Les révoquer seules n'aurait rien changé au risque réel — la recommandation initiale était
  excessive.

---

## 2026-09-08 — Comptes Play et Apple : reportés aux premiers revenus
- **Décision (Benj) :** pas de 25 $ Play ni de 99 $/an Apple pour l'instant. L'**APK est déjà
  téléchargeable depuis le site**, ce qui suffit à la phase actuelle.
- **Quand :** quand les premiers revenus tombent.

---

## 2026-09-06 — Alexandre n'est PAS associé : Presti appartient à Benj seul
- **Décision (Benj) :** l'entreprise lui appartient à 100 %, aujourd'hui (micro) et dans toute société future. Alexandre = **partenaire commercial indépendant**, sans part ni pouvoir de décision. Ceci **remplace** la décision du 2026-08-06 (« Alexandre EST associé », SAS à 2).
- **Rémunération d'Alexandre :** intéressement **20 % du résultat distribuable** (Benj 80 %) **+ commission 20 %** du CA encaissé des clients qu'il apporte (registre des apports). Il facture via sa micro.
- **MAJ 08/09 :** un projet `Contrat-Presti-Alexandre-90-10` (Legal/, .docx/.pdf, « projet à faire relire avant signature ») faisait passer l'intéressement à **90 % Benj / 10 % Alexandre**, la commission à une fourchette progressive de **10 à 20 %** par paliers, et **annulait ce contrat** ainsi que l'accord de fondateurs du 06/08. Rendu sans objet le soir même par la fin de la collaboration (entrée du 2026-09-08 plus haut).
- **Document :** [[Contrat-collaboration-Presti-Alexandre.pdf]] (Legal/, .docx + .pdf — pièces jointes, sans note .md qui les explique ; l'extension évite un lien ambigu dans Obsidian). L'ancien [[Accord-cofondateurs-Reacto]] est **caduc**.
- **Points de vigilance notés dans le contrat :** requalification en salariat (indépendance réelle), statut d'Alexandre pour facturer, fiscalité de la phase micro, absence de société créée de fait.
- **Prochain pas :** relecture expert-comptable/avocat, compléter les champs orange, créer le registre des apports, signer.

---


> Chaque décision importante du projet, datée, avec le pourquoi. La mémoire longue du projet : on doit pouvoir comprendre dans 6 mois pourquoi on a choisi/tué une idée. Entrée la plus récente en haut.

---

## 2026-09-03 — 🔐 Protection des mots de passe fuités : implémentation maison plutôt que plan Pro Supabase
- **Contexte :** l'audit v4 exigeait trois réglages d'authentification Supabase. Deux sont faits. Le troisième, la **protection contre les mots de passe fuités** (HaveIBeenPwned), s'est révélé **réservé au plan Pro** (~25 $/mois) — Benj ne le trouvait pas dans son tableau de bord, et pour cause : il n'y est pas sur le plan gratuit.
- **Décision :** ne pas passer au plan Pro pour ça. **Refaire la fonction nous-mêmes** avec l'API libre de HIBP, en k-anonymat (5 caractères d'empreinte envoyés, comparaison locale), relayée par notre propre serveur pour ne pas rouvrir la CSP.
- **Pourquoi :** protection **équivalente pour 100 % des vrais utilisateurs** (ils passent tous par le site), coût zéro, et message en français qui **explique** au lieu de refuser sèchement. Le seul cas non couvert — un appel direct à l'API Supabase en contournant le site — revient à se saboter son propre compte, et il est de toute façon fermé depuis que la longueur minimale est passée à 12.
- **Trouvé en chemin :** `/api/auth/reset-confirm` n'appliquait **aucune** règle de mot de passe (8 caractères et basta) — on se remettait `azerty12` via « mot de passe oublié ». Vérifié en production avant correction. **Règle à retenir : une règle posée sur le chemin principal ne s'applique pas toute seule aux chemins de secours.**
- **Reste :** la détection de rejeu des jetons de rafraîchissement (Auth → Sessions), seul des trois réglages encore à poser.
- **MAJ 2026-09-05 :** réglé. Ce n'était pas un réglage manquant mais une **sonde fausse** — elle rejouait le parent immédiat, toléré par GoTrue ; corrigée, un jeton deux crans en arrière est refusé. Les trois points du 03/09 sont soldés. Cf. [[Session-2026-09-05-Audit-Final-v6]], section « Clôture (soir du 05/09) ».
- Détail : [[Session-2026-09-03-v4-Audit-Legal-Securite]].

---

## 2026-08-14 — 🎨 Identité visuelle = Anthropic/Claude (demande explicite Benj)
- Benj : « inspire-toi de toi littéralement et applique sur nous » + « niveau que TU proposes » + « qualité ultime ». → Presti adopte l'**identité Claude/Anthropic**.
- Fait (en prod) : refonte du système de design → **fond ivoire chaud (#F3F1E9)**, accent **argile/corail (#C15F3C, le orange de Claude)**, **typographie serif éditoriale (Fraunces)** + grotesque chaud (Hanken Grotesk). Alias legacy repointés (rien de cassé). S'applique à TOUTE l'appli + landing.
- ⚠️ Note design : ce cap (ivoire+serif+terracotta) est normalement un « défaut cliché » à éviter — mais ici c'est une **demande explicite de Benj** (identité Anthropic voulue), donc on l'assume.
- Reste = la CRAFT « qualité ultime » : rebuild éditeur devis avec **aperçu live du document**, détails millimétrés, itéré avec Benj (pas de screenshots possibles ici).
- Ajustement Benj : **fond plus sombre** (fait : #E7E0CF, sable chaud) → « après c'est bon ». Consigne : **au boulot heads-down, ne prévenir QUE quand la 1re fonctionnalité (devis) est ENTIÈREMENT prête.**
- **Fait (en prod)** : éditeur devis premium **2 volets** — saisie à gauche, **document conforme qui se compose en direct à droite** (en-tête entreprise, bloc client, tableau, totaux par taux TVA, cadre signature « devis reçu avant exécution », mentions légales, bloc **assurance décennale**, mention **TVA franchise CIBS**). Section « Vos informations » (SIRET/assurance/IBAN/régime TVA) enregistrée sur le profil. Lignes en cartes éditables.
- **✅ DEVIS ENTIÈREMENT PRÊT (en prod, testé)** :
  - Identité **Anthropic/Claude** (ivoire + corail + serif Fraunces), fond assombri.
  - Éditeur premium **2 volets** avec **aperçu live** du document conforme.
  - **Sélecteur de modèles** Standard/Pro/Expert (Haiku/Sonnet/Opus), **verrouillé par offre** via `artisans.plan` (`lib/models.ts`, `ModelSelect`) — testé : gratuit→standard, business→expert. Aussi sur le générateur de réponse.
  - **PDF conforme** (`lib/DevisPDF.tsx` @react-pdf, `/api/devis/[id]/pdf`) — mentions, assurance, TVA CIBS, signature. Testé : vrai PDF.
  - **Envoi au client** (`/api/devis/[id]/envoyer`, PDF en pièce jointe, statut→envoyé) — pipeline OK.
  - 🐛 **Fix serverless important** : @react-pdf `renderToBuffer` absent de l'export CJS → utiliser `renderToStream` (`lib/renderPdf.ts`) ; + Vercel ne trace pas les polices pdfkit → `outputFileTracingIncludes` sur `pdfkit/js/standard-fonts` dans `next.config.mjs`.
  - ⏳ **Seul reste pour envoyer aux VRAIS clients** : Benj vérifie **prestiapp.fr dans Resend** (aujourd'hui l'envoi ne marche que vers sa propre adresse [EMAIL_MASQUE]). Puis changer le `from` dans `lib/email.ts`.
- Prochaine fonctionnalité (après validation Benj) : **factures** (même moteur, devis→facture).

## 2026-08-26 · PIVOT DESIGN + refonte "Chantier" (déployée)
- **Constat** : malgré le soin, Benj trouvait l'app « bâclée / pas niveau Anthropic ». **Diagnostic** : l'identité crème+corail+serif Fraunces (copie littérale d'Anthropic qu'il avait demandée) = **exactement le cliché "design généré par IA"** → d'où le ressenti de pas-assez-pro.
- **Décision** : nouvelle direction **« Chantier »**, ancrée dans le bâtiment. Palette **bleu plan `#2B50E0` + graphite `#15181D` + papier froid `#F4F4F1` + jaune chantier `#F5B301`**. Police display **Bricolage Grotesque**, corps Hanken, data JetBrains Mono. **Shell à sidebar** (nav gauche), cartes **KPI**, **pills** sémantiques, aperçu devis sur **fond blueprint** avec animation "compose".
- **Méthode validée (anti-rejet)** : je ne peux pas voir l'écran ici → je livre une **maquette Artifact** que Benj regarde → il valide la direction → je code sur le vrai app. La maquette `Presti Console` a été **validée** (« oui c'est bien, pousse plus loin »).
- **Fait & déployé** : `app/globals.css` (tokens + composants), `app/AppShell.tsx`, `app/ModelSelect.tsx` (cartes), pages `dashboard`/`devis`/`devis/[id]`/`outils` converties au shell. Build OK, prod HTTP 200 partout.
- **Accès fondateur** : migration `0003_founders.sql` (colonne `is_founder`) → **Benj doit la faire tourner** dans Supabase ; badge « Fondateur · Accès total » dans le shell ; manque l'email d'Alexandre.
- **Connexions MCP** : Canva + service de templates + prompted-site (pour visuels marketing / inspiration ; l'UI de l'app reste codée).
- **Reste (carte blanche)** : animations réalistes (transitions/présentations), factures, site client, dark mode, jeu de **skills sur-mesure** (`presti-design-system`, `presti-feature`, `presti-legal-fr`, `presti-ux-copy`). Resend : Benj **refait la vérif domaine** (erreur DNS).
- Benj juge l'éditeur de devis fonctionnel mais **utilitaire, pas premium**. Consigne forte : **prendre BEAUCOUP plus de temps, travail extrêmement professionnel, appliquer cette méthode à TOUT.** Qualité > deadline.
- **Cap « niveau Anthropic » pour le devis** : éditeur **avec APERÇU LIVE du document** (façon ReplyPro « on saisit à gauche, le document se compose à droite »), tableau de lignes soigné (glisser-déposer, **autocomplétion depuis la bibliothèque de prix**, sections/sous-totaux, duplication), **carnet de clients**, **PDF irréprochable** (logo + mentions), micro-interactions/états soignés. Même exigence partout (outils, dashboard, site client, factures).
- ⚠️ Contrainte technique : **impossible de prendre des captures d'écran** de l'app dans cet environnement → itérer avec Benj comme « yeux » (build par passes → il juge → raffiner jusqu'au niveau).
- Méthode = passes soignées + validation visuelle de Benj, pas de « fonctionnel et on passe ».

---

## 2026-08-14 — 🎯 Nouvelle phase : chantiers premium (devis / factures / site client)
- Demande Benj : niveau « digne d'Anthropic », **adaptabilité hors norme**, tout documenté dans le vault, carte blanche. **Deadline DEVIS = mercredi 19/08.** Puis factures, puis « site spécial » d'auto-réponse (offre payante).
- Recherche faite (Perplexity **hors crédits** → web) : légal FR (mentions devis/factures, **assurance décennale**, **mention TVA franchise → CIBS au 01/09/2026**, **facturation électronique** réception 2026 / émission micro 2027, TVA 5,5/10/20) + concurrence (Tolteck/Obat/Henrri, trou = simple + IA). → [[Besoins-artisans-et-legal-devis-factures]].
- **Architecture détaillée** posée → [[Architecture-v2-Devis-Factures-SiteClient]] : modèle de données (devis/lignes/factures/clients/postes_types + champs légaux profil), moteur d'adaptabilité (IA génère le devis depuis une description + biblio de prix par métier), conformité auto, PDF (@react-pdf/renderer), numérotation continue (RPC atomique), site client premium.
- Étapes : 7 Devis (mercredi) → 8 Factures → 9 Site client → 10 Stripe.
- Prochaine action = build devis (migration SQL + éditeur + génération IA + PDF conforme).
- **Nouveauté #1 (fait, en prod)** : migration `0002_devis.sql` (tables + champs légaux profil + numérotation atomique `next_numero` + seed bibliothèque de prix 8 métiers) ; `generateDevis` (IA chiffrage structuré JSON) ; `POST /api/devis/generer`. **Testé prod** : chantier électrique 3 pièces → 8 lignes réalistes, unités/TVA justes (10% réno auto), ≈2037€ HT + note de précisions. ⚠️ Benj doit exécuter `0002_devis.sql` dans Supabase. Lib `@react-pdf/renderer` installée.
- **Nouveauté #2 (fait, en prod, migration exécutée par Benj)** : éditeur de devis. Pages `/devis` (liste) + `/devis/[id]` (éditeur : client, chiffrage IA intégré, tableau de lignes éditable, TVA/ligne, remise/acompte/validité, totaux live). API `/api/devis` (création + numérotation continue via RPC `next_numero`) + `/api/devis/[id]` (MAJ). `lib/devisTotals.ts` (calcul partagé). Nav « Devis » ajoutée. **Testé prod** : création DEV-2026-0001 (totaux exacts), édition (recalcul + statut), numérotation continue 0001→0002. ✅
- Nouveauté #3 à venir (= « devis entièrement fonctionnel » pour mercredi) : **PDF conforme** (toutes mentions légales + bloc assurance) + formulaire infos légales du profil (SIRET, assurance, IBAN) + **envoi au client** (Resend).

---

## 2026-08-14 — 🛠️ Espace outils artisan : générateur de réponse (live)
- Insight Benj (bon) : ReplyPro fait « je tape ma demande, l'outil produit » ; Presti ne le faisait QUE côté prospect (lien public). Manquait un **outil côté artisan**. Choix Benj : **réponse + devis** (fait en 2 temps).
- Livré (temps 1) : page **`/outils`** (workspace connecté) = générateur de RÉPONSE — l'artisan colle la demande d'un client → Presti rédige dans son ton (réutilise `lib/ai.ts`), réponse modifiable + copiable. API `/api/tools/reponse` protégée par le jeton Supabase (`supabaseAdmin.auth.getUser`). Nav app (Générateurs / Mes demandes). Redirections inscription/connexion/onboarding → `/outils`. Dashboard passé en app-wrap + appbar.
- **Testé end-to-end en prod** (compte test créé/supprimé) : génère une vraie réponse pro dans le ton ✅.
- ⏭️ Temps 2 = **générateur de devis** (décrire le chantier → devis chiffré éditable). À faire.
- ⏭️ Toujours en attente : brancher prestiapp.fr sur Vercel + vérif Resend (DNS).

---

## 2026-08-14 — 🎨 Refonte design : vraie landing pro déployée
- Déclencheur : Benj a trouvé le site « moche/vide » (les étapes 1-6 = moteur, PAS le design — malentendu d'attente, ma faute de ne pas l'avoir dit).
- Nouvelle page d'accueil = vraie landing (esprit ReplyPro, angle « le premier qui répond décroche le chantier ») : hero + **carte de réponse live** (« répondu en 43 s » = l'élément signature qui montre le produit), section problème + 3 chiffres (7× HBR / <1 min / 3 relances), « comment ça marche » (3 étapes), fonctionnalités (3), tarifs (Gratuit/Pro 39€/Business 79€), bandeau CTA, footer.
- Système de design refait (`app/globals.css`) → toute l'appli (auth, onboarding, dashboard, page publique) en profite. Polices next/font : Bricolage Grotesque (display) + Instrument Sans (texte) + JetBrains Mono (data). Palette verte Presti + off-white cool (pas cream cliché).
- Push GitHub OK **depuis Bash** (credential manager Windows a le token) → Vercel auto-deploy ~18 s. **Moteur inchangé.**
- ⏳ Attente retour visuel de Benj (V1, à itérer sur son goût : couleurs, textes, prix).

---

## 2026-08-14 — 🚀 DÉPLOIEMENT RÉUSSI : Presti est EN LIGNE et fonctionnel
- URL de prod : **presti-ashen.vercel.app** (Vercel, Hobby, repo GitHub privé, auto-redeploy actif).
- 5 variables d'env bien configurées sur Vercel. Crédits Anthropic = FAITS.
- **Chaîne complète testée EN PROD** : accueil 200 ✅, page publique `/l/[slug]` 200 ✅ (clé service OK), POST `/api/leads` → lead créé → **IA (Haiku) a généré une vraie réponse pro dans le ton** (Sophie/fuite évier) ✅ → statut 'repondu' ✅ → relances J+2/5/10 planifiées ✅.
- Domaine choisi : **prestiapp.fr** (actif + boîte mail pro OK).
- **Reste avant de vendre pour de vrai** : (1) brancher `prestiapp.fr` sur Vercel (URL pro) ; (2) vérifier le domaine dans **Resend** (DNS) puis je change l'adresse d'envoi dans `lib/email.ts` → emails délivrés aux VRAIS prospects (aujourd'hui : `[EMAIL_MASQUE]` = livré seulement à l'adresse du compte Resend). (3) optionnel : ajouter `CRON_SECRET` sur Vercel pour protéger le cron des relances.
- Nettoyage à faire un jour : leads de test en base (test-plombier-demo).

---

## 2026-08-14 — Go-to-market lancé : statut + domaine en cours
- **Statut légal** : micro-entreprise DÉPOSÉE au guichet unique INPI (guichet-unique.inpi.fr). Activité = informatique **libérale** (programmation informatique / édition de logiciel, ~62.01Z). Attente du **SIRET (1-4 semaines)**. Pièges rencontrés : (1) l'activité info ne sort QUE si on choisit d'abord la nature « Libérale » (pas commerçant) ; (2) NE PAS cocher « agent commercial » (inscription RSAC ~25€ = c'est ça qui rendait la formalité payante ; sinon création gratuite).
- **Domaine** : commandé (à confirmer lequel — reco donnée = prestiapp.fr ; presti.fr/.com pris). Achat en tant que **particulier** (pas besoin de SIRET pour un domaine). Attente activation ~24-48h.
- **Crédits Anthropic** : à confirmer (fait ou pas).
- **Prochaine action = déploiement Vercel** (ne dépend NI du SIRET NI du domaine — URL gratuite .vercel.app dispo tout de suite ; repo git de presti déjà prêt et commité). Domaine + Resend se brancheront par-dessus quand le domaine sera actif.

---

## 2026-08-06 — Étapes 5 & 6 codées + TESTÉES ✅ (moteur produit complet)
- Étape 5 : dashboard des demandes (`app/dashboard/page.tsx`) — liste des leads (RLS), badges de statut (nouveau/répondu/gagné/perdu), statut modifiable, dépli du détail (message du prospect + réponse auto envoyée). Build ✅.
- Étape 6 : relances auto J+2/J+5/J+10. `lib/ai.ts` (+`generateRelanceReply` + `relanceTemplate` de secours), `app/api/cron/relances/route.ts` (protégé par CRON_SECRET optionnel), planification dans `POST /api/leads`, `vercel.json` (cron quotidien 08:00 UTC). **Testé end-to-end** : relance créée (repli template car pas de crédits), marquée envoyée, non ré-envoyée. Avec crédits → version IA automatiquement.
- ⚙️ Résilience : IA/email non bloquants (lead jamais perdu) ; relance = IA avec repli template si IA indisponible.
- ✅ Toutes les pages testées HTTP 200 après redémarrage propre du serveur.
- ⚠️ Piège appris : ne PAS lancer `next build` pendant que `next dev` tourne (écrase `.next` → 500 transitoires). Stopper le dev d'abord.
- **Reste pour VENDRE pour de vrai** (tout côté Benj, rapide) : (1) crédits Anthropic, (2) domaine vérifié dans Resend (sinon emails prospects non délivrés), (3) déploiement Vercel (le site tourne en localhost). Stripe + landing = après.

---

## 2026-08-06 — Étape 4 codée (réponse IA + email) — BLOQUÉE : crédits Anthropic
- `lib/ai.ts` (Anthropic SDK, modèle `claude-haiku-4-5` = éco, réponse dans le ton de l'artisan) + `lib/email.ts` (Resend via fetch) + câblage dans `POST /api/leads` : message entrant tracé, réponse IA générée → stockée (sens 'out') → email au prospect + notif artisan → statut 'repondu'. Non bloquant (si IA/email plante, lead conservé).
- Build ✅. Test end-to-end : lead créé, message entrant stocké, MAIS l'appel Anthropic renvoie **400 "credit balance too low"** → réponse IA non générée, statut reste 'nouveau'.
- ⚠️ **À FAIRE PAR BENJ** : ajouter des crédits sur console.anthropic.com (Plans & Billing). Rien à changer dans le code après ça.
- Décision modèle : Haiku 4.5 par défaut (réponses courtes, volume, coût mini). Bascule possible vers `claude-opus-5` en 1 ligne (`AI_MODEL` dans lib/ai.ts).
- En cours : étape 5 (dashboard des demandes, ne dépend pas des crédits).

---

## 2026-08-06 — Étapes 3 (+ clés) : capture de leads TESTÉE ✅
- 3 clés en place dans `.env.local` : Supabase secret ✅ (testé), Anthropic ✅, Resend ✅ (`re_...`, la 1re était une clé Anthropic en double). SQL `setup.sql` exécuté par Benj ✅ (table leads répond).
- Étape 3 : page publique `/l/[slug]` + `POST /api/leads` (insert via clé service) → **testé end-to-end** : lead « Jean Client » créé et vérifié en base. ✅
- En cours : étape 4 (réponse IA Anthropic + email Resend + statut 'repondu').

---

## 2026-08-06 — Étape 2 codée (onboarding + lien public) ✅ compile
- Étape 1 confirmée par Benj (dashboard OK). Benj veut que je build **2 → 6 en autonomie** et le prévenir quand c'est vendable.
- Étape 2 faite : page `/onboarding` (nom, métier, ton, tel → table `artisans` + slug) + dashboard qui affiche le **lien public** `/l/{slug}`. `npm run build` ✅.
- **Setup batch demandé à Benj (le seul truc sur ses comptes) :** exécuter `supabase/setup.sql` (toutes les tables) + fournir 3 clés → **Supabase secret** (`sb_secret_`), **Anthropic** (console.anthropic.com), **Resend** (resend.com). Dès qu'il les donne → je continue 3 (capture lead) → 4 (réponse IA + email) → 5 (dashboard leads) → 6 (relances).

---

## 2026-08-06 — ✅ Étape 1 VÉRIFIÉE EN LIVE
- `.env.local` créé (URL + clé publishable Supabase de Benj), serveur `npm run dev` lancé → `localhost:3000` répond, l'app rend, **signup → Supabase OK** (compte test créé, clé validée, 0 erreur console).
- Reste 1 manip côté Benj : Supabase → Authentication → désactiver **« Confirm email »** pour que le login soit instantané (sinon confirmer via email). Compte test à supprimer : `[EMAIL_MASQUE]`.
- Serveur dev tourne en arrière-plan (à relancer avec `npm run dev` dans `Documents/presti` quand besoin).

---

## 2026-08-06 — 🏗️ BUILD LANCÉ : étape 1 (socle + auth) ✅ compile
- Benj : « pas d'interview, on commence la création ». → App créée dans **`C:\Users\benja\Documents\presti`** (Next.js 15 + Supabase, TypeScript).
- Étape 1 livrée : inscription / connexion / déconnexion + dashboard protégé + table `artisans` (SQL) + README. `npm install` OK, `npm run build` ✅ **compile sans erreur**.
- Reste à Benj : créer un projet **Supabase** (gratuit), mettre les clés dans `.env.local`, exécuter le SQL, `npm run dev`, tester signup/login.
- Suite : ouvrir Claude Code dans `Documents/presti` (preview live) → **étape 2** (onboarding + lien public).
- ⚠️ Validation terrain skippée (choix Benj = build-first, valider avec les premiers users).

---

## 2026-08-06 — Stratégie de vente anticipée + jalon "vendable"
- Benj veut être **prévenu dès que le site est vendable** pour lancer la chasse aux clients. → **Engagement Claude :** flaguer le moment où on franchit le jalon **vendable = étapes 1-6 + Stripe + pack légal** ([[Legal-site-web]]). Défini dans [[Plan-Developpement]].
- **Stratégie validée (Benj + Claude d'accord) :** vendre AVANT que ce soit fini. Ordre : interviews/waitlist maintenant → membres fondateurs/pré-ventes → beta payante (co-construction) → vendable officiel.
- « Investisseurs » = interprété comme **membres fondateurs** (clients impliqués qui façonnent le produit). Vrais investisseurs financiers = autre sujet, réglementé, pas la priorité.
- ⚠️ Pack légal du site = 3 docs (mentions légales + CGV/CGU + RGPD), pas juste "les mentions légales".

---

## 2026-08-06 — Plan technique : architecture + plan de dev + boussole
- Livré (via les 2 prompts de Benj) : [[Architecture]] (stack Next.js + Supabase + Claude + Stripe, structure fichiers, BDD, routes API, flux) et [[Plan-Developpement]] (10 étapes testables, commence par le socle+auth).
- Créé aussi [[Récap-Projet]] = fichier boussole (tout le projet + carte du vault) pour que Benj se repère.
- ⚠️ Rappel : archi/plan = **provisoire**, à builder APRÈS la validation terrain.

---

## 2026-08-06 — Volte-face : Alexandre devient ASSOCIÉ (equity) → SAS
- Benj : « si Alexandre fait partie du projet, il doit avoir sa part » → Alexandre passe d'apporteur (commission) à **associé** (equity).
- Conséquences : structure = **SAS** (pas micro) ; doc = **accord de fondateurs / pacte d'associés** (contrat d'apporteur abandonné) → [[Accord-cofondateurs-Reacto]] + artéfact imprimable refait.
- ⚠️ **Vesting obligatoire** (parts acquises ~4 ans + cliff 1 an) sinon Alexandre garde tout s'il part tôt. Split = Benj majoritaire, % à définir.
- Pragmatique : signer l'accord maintenant (gratuit, protège), créer la SAS plus tard (après validation).

---

## 2026-08-06 — Structure : chacun micro-entrepreneur (les 2 sont majeurs)
- Question micro vs SAS → réponse : **chacun micro-entrepreneur** pour démarrer (cohérent avec l'option B : Benj proprio, Alexandre commission). Simple, gratuit, réversible. Détail : [[Structure-micro-vs-sas]].
- SAS = plus tard, si Alexandre devient **vrai associé** ou si ça décolle (plafond, fiscalité, levée).
- Minorité : plus un sujet (les deux sont majeurs).

---

## 2026-08-06 — Nom choisi : PRESTI
- Benj tranche le nom : **Presti** (prestation + presto). Réacto/Sitô écartés. Landing + contrat mis à jour. À vérifier : marque INPI + domaine .fr.

---

## 2026-08-06 — Montage tranché : option B (micro Benj + Alexandre apporteur)
- **Benj choisit B** : lui = propriétaire de Réacto en **micro-entreprise** ; Alexandre = **apporteur d'affaires / commercial à la commission** (il fait la prospection + la com). **Part inégale** : Benj gagne plus (il build tout le produit).
- Bon doc = **contrat d'apporteur d'affaires** → [[Contrat-apporteur-affaires-Alexandre]] (l'accord de co-fondateurs est superséded).
- Points clés : Alexandre devrait être **auto-entrepreneur** pour facturer ses commissions ; garder son autonomie (éviter le **salariat déguisé**) ; % de commission à négocier (~25-40 %, ne pas lowball le moteur de croissance).

---

## 2026-08-06 — Cadrage juridique (accord fondateurs) + structure à trancher
- Benj veut un "contrat de travail" avec Alexandre + créer "leur micro-entreprise". → **2 corrections clés** : (1) contrat de travail = mauvais outil pour 2 co-fondateurs à 0 € ; (2) une micro-entreprise = 1 seule personne (pas 2 proprios).
- **À trancher :** (A) associés à parts égales → **société** (SAS/SASU) + pacte d'associés ; (B) Benj proprio (micro) + Alexandre **apporteur d'affaires** à la commission.
- Livré : **modèle d'accord de co-fondateurs** (rôles, répartition, vesting, PI, départ) → [[Accord-cofondateurs-Reacto]]. À faire valider par un expert-comptable/juriste.
- ⚠️ URSSAF : Claude ne peut PAS enregistrer l'entreprise (données perso/ID + compte + formulaire = c'est Benj qui le fait). Guidage seulement.
- Point à vérifier : minorité éventuelle (autorisation parentale).

---

## 2026-08-06 — ReplyPro = produit du POTE (allié) + modèle par paliers
- **News :** reply-pro.fr est le SaaS d'un pote de Benj → ils vont s'entraider. Ce n'est PAS un concurrent : c'est un **allié + validation vivante + distribution potentielle**. Réacto (décrocher le job) et ReplyPro (être payé) = **complémentaires**. Détail : [[Concurrent-ReplyPro]].
- **Modèle produit (demande de Benj) :** copier la structure ReplyPro/Claude = **abonnement par paliers** (Gratuit / Pro 39€ / Business 79€) + service de **génération de devis**. Détail : [[Tarifs]].
- ⚠️ **À trancher avec le pote :** ajouter la génération de devis = chevaucher son produit. Option plus saine = rester complémentaires + cross-vente.
- Landing mise à jour : 3 paliers + carte "Génère tes devis". Même lien.

---

## 2026-08-06 — Concurrent FR repéré : ReplyPro + landing recolorée
- Benj a partagé reply-pro.fr (réf design) → c'est un **concurrent FR** (artisans : devis + factures + relances impayés + avis Google, 30-70 €/mo). Détail : [[Concurrent-ReplyPro]].
- **Lecture :** ✅ valide le marché (artisans FR paient 30-70 €/mo) ; ⚠️ angle différent du nôtre (eux = impayés/documents = "être payé" ; nous = réponse instantanée aux leads = "décrocher le job").
- Landing Réacto **recolorée façon ReplyPro** (crème + vert émeraude) à la demande de Benj.
- À trancher : notre différenciation tient-elle ? → à creuser en interview.

---

## 2026-08-05 — Brief Alexandre créé (fin de session)
- Fichier handoff complet, autonome, pour Alexandre : [[Brief-Alexandre-Artisans]] (contexte + raisons + script + où trouver les artisans + accroche + GO/KILL).
- **On reprend plus tard** à l'étape : Alexandre interviewe 5 artisans → analyse GO/KILL.

---

## 2026-08-05 — Marché tranché : FRANCE + script de validation prêt
- **Benj tranche :** marché = **France** (esquive la concurrence anglaise, edge langue/marché). Canal = local (FB, forums métier, bouche-à-oreille), pas Reddit pour cette cible.
- **Livrable :** [[Guide-interview-artisans-FR]] — script d'interview prêt (angle "ne plus perdre de chantiers"), objectif 5 artisans.
- **Prochain pas :** Benj/Alexandre interviewent 5 artisans FR → GO/KILL selon les réponses.

---

## 2026-08-05 — PARI N°1 = #2 artisans, avec changement d'ANGLE
- **Benj tranche :** on part sur #2 (artisans). #1 (avis Google) en réserve (douleur peu ressentie).
- **Changement d'angle pour éviter la course à la voix :** on n'attaque PAS "générer le devis" (crowded : VoxTrade, QuoteIQ). On attaque le **money-leak ressenti** = *perdre le chantier après le devis* (réponse trop lente / pas de relance). Wedge : **réponse instantanée aux leads + relance auto des devis** — "tu ne perds plus jamais un chantier".
- **À trancher (pivotal) :** marché **EN/Reddit** (gros, mais concurrence voix) vs **FR/local** (peu de concurrence + edge Benj, mais artisans peu sur Reddit).
- Détail : [[Probleme-devis-voix-artisans]].

---

## 2026-08-05 — Principe clé : viser la douleur RESSENTIE (Benj a challengé #1)
- Benj : « en quoi les avis c'est un vrai problème concret ? » → juste. Le lien avis→clients est réel mais **invisible/pas ressenti** par le patron → dur à vendre. + Google fait déjà des réponses IA gratuites + le vrai job = obtenir plus d'avis, pas répondre.
- **Principe retenu :** privilégier les problèmes à **douleur ressentie** (le client peut pointer l'euro/le chantier perdu) = meilleur prédicteur de willingness-to-pay. #1 (avis) = douleur diffuse ; #2 (devis artisan) = douleur vive.
- #1 passe **FINALISTE MAIS FRAGILE**. Cf. [[Probleme-avis-google]].

---

## 2026-08-05 — Packages complets pour les 2 finalistes (le duo tranchera)
- Sur demande de Benj : traiter à fond **#1 avis Google** et **#2 devis voix artisans**. Fiches complètes (web + stress-test + 10 questions) : [[Probleme-avis-google]], [[Probleme-devis-voix-artisans]].
- **#1 web-vérifié :** 53 % des petites entreprises ne gèrent pas leur e-répu ; Birdeye 299-449$/mo, Podium 399$/mo → **trop cher pour un solo = gap prix/simplicité**. Build simple. Mais pain mou (ROI indirect) + marché encombré.
- **#2 web-vérifié :** douleur **énorme et chiffrée** (perte 3-5 chantiers/mois, ~£8k/an de devis jamais envoyés, 2,5h/sem) ; budget prouvé (Jobber/Tradify). ⚠️ MAIS le **wedge voix est déjà pris** (VoxTrade, Voice Build, QuoteIQ) + build précision-critique + artisans peu sur Reddit.
- **Lecture Claude :** #2 = pain/budget plus forts mais concurrence voix déjà là ; #1 = build plus simple + vrai gap prix mais pain plus mou. → **décision par validation terrain** (les 10 questions Prompt 2).
- **Prochain pas :** Alexandre pose les 10 questions des 2 fiches à de vrais prospects → on tranche sur les réponses.

---

## 2026-08-05 — Contraintes verrouillées + liste finale
- **Benj tranche :** **SaaS pur** (pas de done-for-you) · **Reddit maintenu** comme canal (« y'a de tout dessus »).
- **Règle de design (wedge anti-concurrence) :** SaaS ultra-simple, un seul job, un bouton, zéro config — car les outils existants sont trop complexes/chers pour le client non-tech → ils le ratent.
- **Livrable :** [[Liste-finale-problemes-2026-08-05]] — 5 problèmes, reco n°1 = auto-réponse aux avis Google.
- **Prochain pas :** Benj choisit 1 → stress-test (Prompt 1) + 10 questions (Prompt 2) → interviews.

---

## 2026-08-05 — PIVOT DE CIBLE : les non-initiés à l'IA (30-50+), modèle done-for-you
- **Décision (Benj) :** viser les gens qui ne maîtrisent pas l'IA (30-40-50+ ans) — typiquement petits commerçants / artisans / pros locaux — qui ont un problème (présence en ligne, site, admin…) mais **ne peuvent pas le résoudre eux-mêmes**. Logique : moins de concurrence *ressentie*, car le client ne sait pas se servir des outils existants → **plus facile à vendre**.
- **Nom de la stratégie :** **arbitrage IA** — l'IA rend la livraison cheap pour NOUS ; le client n'y a pas accès → on capture l'écart. Moat = **distribution + confiance**, pas la tech.
- ⚠️ **2 conséquences à trancher :**
  1. **Canal Reddit inadapté** (cette cible n'y est pas) → pivoter vers Google Maps / groupes FB locaux / démarchage (mail-tel-porte).
  2. **Modèle probable = done-for-you récurrent** (service productisé propulsé IA), PAS un SaaS self-serve pur (contradiction pour des gens qui savent pas utiliser un logiciel). À confirmer avec Benj.
- **En réserve :** deals créateurs (C1), lead-finder Reddit.
- **Prochain pas :** confirmer le modèle (DFY vs SaaS) + choisir un secteur, puis vérif web du budget + interviews.

---

## 2026-08-05 — PARI N°1 rebasculé : deals sponsors des créateurs (se faire payer)
- **Décision :** sur demande de Benj, on ajoute et on choisit les **créateurs comme clients**. Problème retenu : [[Probleme-deals-sponsors-createurs]]. Le lead-finder Reddit passe en réserve.
- **Web-vérifié RÉEL :** 87 % des créateurs déjà payés en retard (Forbes/Digiday/Campaign) ; marché prouvé par **Passionfroot** (& Creator Hero) qui vendent déjà "deals + CRM + paiement".
- **Reality check :** le tout-en-un est déjà pris par Passionfroot → interdiction de refaire leur suite. **Wedge = se concentrer sur "faire payer le créateur à temps"** (facturation + relance auto des marques + infos remit), verticalisé sur un type de créateur Reddit-atteignable.
- **Stress-test (Prompt 1) :**
  - *5 raisons d'échouer :* (1) Passionfroot déjà installé ; (2) on ne peut pas FORCER une marque à payer (cause racine hors de notre contrôle) ; (3) WTP des créateurs mid-tier fragile (Google Sheet gratuit) ; (4) paiements internationaux/taxes = build plus lourd qu'il n'y paraît ; (5) **acquisition Reddit incertaine** — les créateurs vivent surtout sur YT/TikTok/IG (⚠️ tension avec notre canal Alexandre).
  - *3 signaux à confirmer :* (1) Passionfroot & co ont des créateurs qui paient/renouvellent ; (2) sur les subs créateurs, plaintes actives sur le chase-payment/l'admin ; (3) des créateurs ont déjà payé (Passionfroot/VA/manager) pour gérer ça.
- **Verdict :** GO pour valider (interviews Prompt 2 + terrain) avant tout code.

---

## 2026-08-05 — Problème n°1 choisi : lead-finder pour la vente sur Reddit
- **Décision :** attaquer le problème « repérer les prospects chauds sur Reddit + les suivre sans se faire ban », pour les indés/freelances/agences qui vendent via les communautés. Fiche : [[Probleme-lead-finder-reddit]].
- **Pourquoi celui-là :** seul terrain qui coche tout — indépendant de l'OFM/YouTube, budget prouvé (GummySearch & co), Reddit-native (canal du duo), buildable solo+IA, récurrent, et **dogfoodable** (Alexandre s'en sert pour notre propre prospection).
- **Stress-test (Prompt 1 — investisseur sceptique) :**
  - *5 raisons d'échouer :* (1) marché encombré ; (2) dépendance à Reddit qui durcit API/anti-automation ; (3) willingness-to-pay basse (cible radine, alternative gratuite F5Bot) ; (4) la valeur c'est le DEAL pas l'alerte — si ça convertit pas, churn ; (5) "IA qui lit l'intention" = copiable en une semaine → moat faible.
  - *3 signaux d'un vrai marché à confirmer :* (1) des gens **paient et renouvellent** déjà (avis GummySearch) ; (2) des vendeurs **se plaignent activement** du bruit des alertes / du temps de scroll sur Reddit ; (3) quand Alexandre poste une aide **value-first**, les gens **répondent/DM** (cible atteignable + réceptive).
- **Verdict :** CREUSER — validé comme pari n°1, à confirmer par terrain avant tout code.

---

## 2026-08-05 — Rôles & contraintes du duo fixés
- **Décision :** Benj = builder (fait tout le code/produit avec l'IA) · Alexandre = hustler (prospection & acquisition clients). Budget **0 €**.
- **Canal d'acquisition :** **Reddit** (subreddits de la niche), approche **value-first** (anti-autopromo). Reddit sert doublement : sourcing des problèmes + acquisition.
- **Conséquence stratégique :** viser des problèmes **B2B/pros avec budget existant** dont les clients **se regroupent dans des subreddits actifs identifiables**. MVP **buildable à l'IA en quelques semaines**. Business **récurrent** de préférence.
- Détaillé dans [[Profil-Fondateurs]].

---

## 2026-08-05 — Lancement du projet SaaS
- **Décision :** monter un SaaS à 2, en parallèle du reste. Projet **indépendant** de l'OFM et du YouTube.
- **Pourquoi :** thèse "2026 + IA" — mais corrigée : l'IA rend le build facile pour tout le monde, donc le moat = accès au problème + distribution, pas la facilité technique.
- **Phase :** découverte de problème. On ne code pas tant qu'un problème n'est pas validé.
- **Setup :** cerveau Obsidian créé + skills `saas-problem-finder` et `vault-organizer`.
- **Prochain pas :** remplir [[Profil-Fondateurs]], puis sourcer une première liste de problèmes.
