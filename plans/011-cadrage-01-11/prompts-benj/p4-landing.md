 PROMPT 4 — Refonte de la landing PrestiApp.fr

Tu es un directeur artistique web, copywriter conversion et développeur front-end senior.

Ta mission : refondre complètement la landing page de PrestiApp.fr pour la rendre courte, claire, belle, rapide et orientée conversion.

Presti est un SaaS de gestion pour artisans : devis, factures, clients, inventaire, chantiers, relances et agents IA.

Le problème actuel : la page est trop longue et crée de la friction. Elle doit devenir simple, directe et compréhensible en moins de 10 secondes.

## Objectif

Faire comprendre immédiatement :

1. Ce qu’est Presti.
2. À qui ça sert.
3. Quel problème ça résout.
4. Quel résultat l’artisan obtient.
5. Quelle action faire ensuite.

## Positionnement

Presti = l’assistant de gestion des artisans.

Promesse principale possible :

> « Créez vos devis en quelques minutes. Laissez l’IA gérer les relances, les documents et le suivi. »

Ou :

> « Votre gestion d’artisan, simplifiée par l’IA. »

## Structure imposée

Maximum 7 sections.

### 1. Hero

- Une phrase de valeur très claire.
- Une sous-phrase courte.
- Un CTA principal : « Essayer Presti ».
- Un CTA secondaire : « Presti pour l’entreprise ».
- Une preuve visuelle : capture d’app, démo courte ou visuel produit.

Interdit :

- Long paragraphe.
- Jargon technique.
- Mention de n8n, Supabase, MCP, agents ReAct ou workflows.
- Promesse exagérée.

### 2. Problème

3 douleurs maximum :

- Trop de temps perdu sur les devis.
- Relances oubliées.
- Inventaire et documents difficiles à suivre.

### 3. Comment ça marche

3 étapes :

1. Décris le chantier ou envoie ta demande.
2. Presti prépare le devis.
3. Tu valides et envoies.

### 4. Fonctionnalités essentielles

6 fonctionnalités maximum :

- Devis assistés par IA.
- Factures et relances.
- CRM clients.
- Inventaire.
- Documents centralisés.
- Assistant de gestion.

### 5. Pour qui

- Artisans du bâtiment.
- TPE du bâtiment.
- Architectes.
- Artisans multi-chantiers.
- Entreprises qui veulent industrialiser leur gestion.

### 6. Presti pour l’entreprise

Bloc distinct :

> **Presti pour l’entreprise**  
> Vous avez plusieurs collaborateurs, un CRM, un inventaire ou des processus internes à automatiser ?  
> Nous intégrons Presti à votre organisation et connectons des agents IA à vos outils.  
>  
> [Demander une démo]

Pas de prix affiché.
Pas de détail technique excessif.

### 7. CTA final

- « Créer mon compte ».
- « Demander une démo entreprise ».

## Design

- Design moderne, sobre, premium.
- Mobile-first.
- Typographie très lisible.
- Beaucoup d’espace blanc.
- Peu de couleurs.
- Contraste élevé.
- Visuels produit réels plutôt qu’illustrations génériques.
- Animations légères uniquement si elles améliorent la compréhension.
- Performance prioritaire.

## Copywriting

- Français simple.
- Phrases courtes.
- Bénéfices avant fonctionnalités.
- Zéro jargon.
- Zéro superlatif inutile.
- Zéro promesse non vérifiable.
- Ton humain, direct et professionnel.

## Livrables

1. Nouvelle structure de page.
2. Copywriting complet en français.
3. Hiérarchie visuelle.
4. Wireframe ou maquette structurée.
5. Composants réutilisables.
6. Version mobile.
7. Microcopy des boutons.
8. SEO minimal : title, meta description, H1, H2.
9. Recommandations de performance.
10. Plan des pages secondaires si nécessaire.

## Méthode

1. Analyse la page actuelle si le code est fourni.
2. Pose-moi uniquement les questions bloquantes.
3. Propose 3 directions de landing.
4. Attends mon choix.
5. Produis la copywriting complète.
6. Produis le design et le code.
7. Teste la version mobile.
8. Optimise la performance.

Commence par :

1. Diagnostic de la page actuelle.
2. Questions bloquantes.
3. Trois directions créatives.
4. Structure recommandée.

Ne génère pas le code complet avant mon choix de direction.

---

# ANNEXE 1 — Les données réelles de Presti au 01/11/2026

Cette annexe ne change pas la consigne ci-dessus : elle te donne ce que tu ne peux pas savoir seul (où on en est, ce qui existe, ce qui a été décidé, comment on fonctionne). Lis-la avant ta première réponse, et vérifie chaque point dans le code ou la base avant de t'appuyer dessus.

## A. Où trouver la mémoire du projet
- **Le cerveau Obsidian** (outils MCP `cerveau` : `regles_pour` avant une action à risque, `chercher` puis `lire` ; à défaut le vault `C:/Users/benja/Documents/SaaS` : `wiki/hot.md`, `wiki/concepts/`, `Decisions/Journal-Decisions.md`, `Récap-Projet.md`, la dernière note de `Produit/`). La RAM du PC est presque pleine : sous RAM basse, le cerveau n'injecte plus rien dans les sessions. Il faut alors le lire à la main.
- **`presti-ops/QG/`** sur le PC : `ETAT.md`, `DECISIONS.md` et le dernier `BILAN-*.md`.
- **Le dépôt `presti`** : `CLAUDE.md` et `AGENTS.md` (règles du dépôt), `.orchestre/contexte.md` (carte du code), `plans/` (journaux).
- **L'audit du 29/10** : `presti-ops/assistant-gestion/ETAT-DES-LIEUX-2026-10-29.md`.

## B. L'état réel des outils au 01/11/2026
| Outil | État | Où |
|---|---|---|
| Claude Code | marche, avec 13 agents `presti-*` et 53 skills dans `.claude/` | session ouverte sur `C:/Users/benja/Documents/presti` |
| Hermes Agent | branché sur Claude Code depuis le 01/11 (avant : en pause depuis le 11/10) | serveur Oracle |
| Orca | à vérifier : installé ou non, et comment il se connecte | — |
| n8n | marche (Benj, 01/11) | serveur Oracle, sous Docker |
| Docker | marche (Benj, 01/11) | serveur Oracle |
| Serveur Oracle | en service (Benj, 01/11) ; disque relevé à 99 % le 11/10, à vérifier avant d'installer | — |
| Supabase | marche : projet `gorcdvmueakcncsmrouo`, `pg_cron` avec 15 tâches, un « tic » chaque minute (`/api/agents/tic`) | production |
| Vercel | offre Hobby : 2 crons au plus, tous deux pris (`/api/cron/relances` à 8 h, `/api/canaux/relever` à 7 h) | production, prestiapp.fr |
| Obsidian | marche, mais limité par la RAM du PC | PC |
| MCP | connecteurs Supabase, Vercel, GitHub, Gmail, Slack, Figma, Blender, HyperFrames, ElevenLabs… | Claude Code |
| Firecrawl | l'API en ligne est à sec (erreur 402) ; une version open source s'auto-héberge avec Docker | — |
| Scrapin | jamais branché | — |
| Apify | clé invalide sur le PC ; Crawlee, sa bibliothèque open source, s'installe gratuitement | — |
| WaveSpeed | payant à l'usage | — |
| Kokoro | gratuit, local (Apache-2.0), voix française `ff_siwis` | PC |
| Whisper | gratuit, local | PC |
| ScrapeGraphAI | installé en local | PC |
| Slack `#presti-auto`, Telegram | branchés (`lib/agents/telegram.ts`) | — |
| GitHub Actions | quota épuisé : audit, sauvegarde et qualité échouent depuis le 25/10, donc **plus aucune sauvegarde nocturne** | — |
| Relève de la boîte e-mail (cron de 8 h) | en échec : identifiants refusés | — |
| Tâches planifiées du PC | ne tournent plus depuis le 28/10 | PC |
| Budget IA | alerte dépassée (1 547 € relevés le 21/10 pour une alerte à 50 €, chiffre à revérifier) | — |

**Décision de Benj (01/11) : on ne paie aucun outil en plus.** Ce qui est payant ou à sec est remplacé par un équivalent gratuit, installé sur le serveur Oracle ou le PC.

## C. Presti en production (ne rien raser)
- **Site** : prestiapp.fr ; console sur qg.prestiapp.fr.
- **Code** : Next.js 16.4.3 sur Vercel, Supabase avec environ 180 migrations, et une RLS par `artisan_id` (garde de session sur 63 tables, migration 0138).
- **Branches et déploiement** : un push sur `main` déploie en production. Ensuite, `node scripts/attendre-deploiement.mjs`. Avant de pousser une page, `npm run build`.
- **Tests** : la vraie commande est `node scripts/tout-verifier.mjs`. Une suite absente de son tableau `SUITES` n'est jouée par personne. `npm test` n'existe pas, et `npm run lint` est mort.
- **Drapeaux** : `lib/flags.ts` cache ce qui n'est pas fini. On colle la migration, PUIS on lève le drapeau.
- **Offres** : elles sont dans `lib/plans.ts`, seule source de vérité.
  - **Studio** : 59 €/mois. L'IA prépare et l'artisan valide. Essai de 7 jours sans carte.
  - **Signature** : 99 €/mois. Envoi autonome, pilote automatique, CRM. Essai de 21 jours sans carte.
  - **Business** : compte interne du fondateur.
  - **Essentiel** : n'est plus vendu.
  - **Troisième offre décidée le 01/11** : « Presti pour l'entreprise », sur mesure, sur démonstration et sur devis, sans prix public. Elle sert aux entreprises à plusieurs collaborateurs et aux architectes qui veulent intégrer Presti à leur organisation, avec des automatisations IA branchées sur leurs outils.
- **White-label** : les sites et pages des artisans (`/site`, `/p`) et les e-mails envoyés à leurs clients n'affichent jamais « Presti ».
- **Données** : aucune donnée réelle dans les tests, aucun secret versionné, aucune donnée de prospect ou de client envoyée à un modèle gratuit en ligne.

## D. La page d'accueil telle qu'elle est
- **`app/page.tsx` compte aujourd'hui 14 sections** :
  - hero (l.168), bande d'accroche, preuve ;
  - `comment` ;
  - `fonctionnalites` : démo `DemoSequence`, ou `DemoVideo` si le drapeau `landingVideo` est levé ;
  - `chiffres` ;
  - `compta` (fond clair, `lp-clair`) ;
  - `pour-qui` ;
  - `confiance` (fond clair) ;
  - `tarifs` ;
  - `comparatif` ;
  - `maquette` (formulaire `MaquetteForm`, branché sur les prospects entrants) ;
  - `questions` ;
  - l'appel final.
- **Autres pages existantes** : `/offres`, `/tarifs` et `/contact` (avec `Formulaire.tsx`).
- **Les prix** se lisent dans `lib/plans.ts` : Studio 59 €/mois (essai de 7 jours sans carte) et Signature 99 €/mois (essai de 21 jours sans carte). L'offre « Presti pour l'entreprise » est sur mesure, sans prix public (décision du 01/11).
- **Le design en place** : skill `presti-design`.
  - Dark cinématique chaud : fond nuit `#0A0C11`, accent corail `#D97757`, vert `#38CD8C` seulement pour « validé », jamais de bleu ni de cyan.
  - Police Bricolage Grotesque.
  - La note du cerveau « Refonte 18-10 pistes A et B » recommande la piste B « Cinéma » pour la landing.
  - Des travaux existent peut-être sur la branche `refonte-1018` et derrière le drapeau `landingV2`, à vérifier.
- **Performance mesurée le 18/10** : temps de blocage (TBT) de 950 ms sur ordinateur et de 2 900 ms sur mobile.
- **⚠️ 12 fichiers de la vitrine sont modifiés et non commités sur le PC depuis le 27/10** (clone `C:/Users/benja/Documents/presti`). **Décision de Benj (01/11) : on les garde et on les intègre.** Ne pas les écraser.
- **Déploiement** : un push sur `main` met en production. Avant, `npm run build` en local ; après, `node scripts/attendre-deploiement.mjs`.

## E. Décisions de Benj du 01/11 pour ce chantier
- **Le fond** : le défaut proposé, sombre et aéré avec des sections claires ponctuelles, est OK.
- **Le bloc « Presti pour l'entreprise »** : OK, tel qu'écrit dans ce prompt, sans prix.
- **Les architectes** font partie de la cible, avec les artisans et les entreprises.

## F. Ce que la page a le droit de promettre (« Positionnement automatique » du 25/10, `plans/promesses.md`)
- **On dit « automatique »**, de façon vraie selon l'offre : Studio prépare et l'artisan valide ; Signature envoie seul.
- **Interdits** :
  - les appels téléphoniques gérés ;
  - les rendez-vous pris seuls ;
  - les notifications inventées ;
  - le devis envoyé seul sous Studio ;
  - les paiements encaissés par l'IA ;
  - toute fonction derrière un drapeau baissé (WhatsApp, réseaux, OCR d'inventaire).
- **Pas de faux témoignage**, pas de faux logo client, aucun chiffre sans source.
- **Toute maquette d'un artisan fictif** porte « Exemple. ».
- **Les organisations multi-membres** se construisent en même temps (prompt 3). Tant qu'elles ne sont pas livrées, la page ne montre pas d'écran d'équipe.

---

# ANNEXE 2 — Précisions de mise en œuvre (01/11/2026)

Ces précisions appliquent la consigne ci-dessus à Presti tel qu'il est : comment brancher chaque partie du prompt sur l'existant, les règles du dépôt, les tests et la première réponse attendue. Elles complètent le prompt, elles ne le remplacent pas. En cas de doute : la consigne ci-dessus, les décisions de Benj du 01/11 et la loi passent avant.

## Règles de travail sur Presti
- Les règles de `CLAUDE.md` et `AGENTS.md` du dépôt `presti` s'appliquent en entier (identifiants et commentaires en français, drapeau dans `lib/flags.ts` pour tout ce qui n'est pas fini, migration collée PUIS drapeau levé, aucun chiffre non sourcé, aucun secret versionné, zéro donnée réelle dans les tests, auditeurs distincts de celui qui corrige, poussé n'est pas déployé).
- **On ne rase rien** : Presti est en production (≈180 migrations, assistant, CRM, devis, factures, inventaire, pilote automatique, prospection serveur). Chaque prompt commence par **l'inventaire de l'existant**, puis branche et corrige pas à pas.
- **Aucune action irréversible ni sortante sans Benj** (publication, dépense, création de compte, migration en production, suppression, envoi à un client d'artisan hors des réglages de l'artisan), **sauf la prospection par e-mail**, que Benj a voulue automatique et sans lui le 01/11 : elle part seule dans les limites du prompt 1 (porte de conformité, juges, plafonds, disjoncteurs, interrupteur général). Préparer, simuler, mesurer, brouillonner : oui, sans attendre.
- **Installer un outil gratuit** (open source ou auto-hébergé) sur le serveur Oracle ou le PC est autorisé par Benj (01/11) : licence vérifiée et notée, aucune carte bancaire, aucun abonnement. Un outil auto-hébergé qui touche des données de prospect ou de client s'inscrit au registre des traitements (`docs/registre-traitements`) avec l'hébergeur et la région du serveur.
- **Benj veut de l'autonomie** : chaque question bloquante vient avec une réponse par défaut ; tout ce qui se défait avance avec ce défaut.
- **RGPD et vérité** : aucune donnée inventée, chaque fait a une source et une date ; aucune donnée de prospect vers un modèle gratuit en ligne ; une preuve est une sortie de commande, pas une phrase.
- **Un test vert ne prouve que ce qu'il regarde** : chaque suite peut rougir (mutation prouvée), entre au lanceur `scripts/tout-verifier.mjs`, et se joue hors ligne.


### 1. Ta mission

Tu es directeur artistique web, expert en conversion SaaS B2B et développeur front senior (Next.js). Ta mission : refondre la page d'accueil de **prestiapp.fr** pour qu'un artisan comprenne en 5 secondes ce que Presti fait pour lui, ait envie de l'essayer et s'inscrive, **en partant de la page actuelle**, qui est en production.

### 2. Ce qui existe déjà (à inventorier en premier)

- **`app/page.tsx`** : 14 sections aujourd'hui : hero, bande d'accroche, preuve, `comment`, `fonctionnalites` (démo `DemoSequence`, ou `DemoVideo` si le drapeau `landingVideo` est levé), `chiffres`, `compta` (fond clair), `pour-qui`, `confiance` (fond clair), `tarifs`, `comparatif`, `maquette` (formulaire `MaquetteForm`), `questions`, appel final. Plus la page `/offres`, `/contact` (formulaire) et `/tarifs`.
- **Le design** : skill `presti-design` (dark cinématique chaud : fond nuit `#0A0C11`, accent corail `#D97757`, vert `#38CD8C` seulement pour « validé », jamais de bleu ni de cyan ; Bricolage Grotesque), et la note du cerveau « Refonte 18-10 pistes A et B » : **piste B « Cinéma » pour les surfaces de présentation** (la landing), piste A « Instrument » pour la console. Vérifie si la branche `refonte-1018` et le drapeau `landingV2` existent et ce qu'ils contiennent avant de commencer.
- **Les règles de promesse** : notes « Positionnement automatique » (25/10) et « Promesses dans les pubs », fichier `plans/promesses.md`. On dit « automatique » partout, mais selon l'offre : Studio prépare et l'artisan valide, Signature envoie seul. **Interdits** : appels téléphoniques gérés, rendez-vous pris seuls, notifications inventées, devis envoyé seul sous Studio, paiements encaissés par l'IA, toute fonction derrière un drapeau baissé (WhatsApp, réseaux, OCR d'inventaire).
- **Les prix** viennent de `lib/plans.ts`, jamais écrits à la main : Studio 59 €/mois (essai 7 jours sans carte), Signature 99 €/mois (essai 21 jours sans carte).
- ⚠️ **12 fichiers de la vitrine modifiés et non commités sur le PC depuis le 27/10** (clone `C:/Users/benja/Documents/presti`). **Décision de Benj (01/11) : on les garde et on les intègre.** Lis-les en premier, commite-les sur une branche à part (jamais sur `main` sans build vert), et construis la nouvelle page par-dessus ; ne les écrase jamais.

### 3. Ce que Benj demande, traduit dans le réel

- **7 sections au plus** (contre 14 aujourd'hui), chacune avec un seul message. Proposition par défaut, le bloc entreprise compris : 1. Hero (promesse, démo animée, un seul bouton « Essayer gratuitement ») ; 2. Ce que Presti fait à votre place (devis, relances, factures, compta, stock, en vrais extraits animés) ; 3. Comment ça marche en 3 temps ; 4. Pour qui (artisans, TPE du bâtiment, architectes, entreprises) ; 5. Confiance (vos données, votre marque devant vos clients, RGPD, mentions légales) ; 6. Tarifs (Studio, Signature, essai sans carte) suivis du bloc « Presti pour l'entreprise » ; 7. Questions et appel final (« Créer mon compte » et « Demander une démo entreprise »). Le comparatif, les chiffres et la maquette ne disparaissent pas du site : ils passent sur `/offres` ou en sous-pages.
- **De l'espace et de la respiration** (Benj, 01/11 : « c'est ok » sur le défaut) : la charte sombre validée reste, avec **beaucoup de vide autour de chaque message**, des marges généreuses et les sections claires ponctuelles qui existent déjà (`compta`, `confiance`). Pas de passage de la page entière en fond blanc.
- **Animations futuristes**, au niveau des vidéos de référence de Benj, mais sans ralentir la page (voir §5) : mouvement à la place du texte, objets en héros, vrais écrans de Presti animés, `prefers-reduced-motion` respecté.
- **« Presti pour l'entreprise »** (troisième offre, sur mesure, décidée le 01/11) : un bloc distinct, comme dans le prompt de Benj : « Vous avez plusieurs collaborateurs, un CRM, un inventaire ou des processus internes à automatiser ? Nous intégrons Presti à votre organisation et connectons des agents IA à vos outils. » Bouton « Demander une démo », qui mène au formulaire `/contact` (ou à `MaquetteForm`, déjà branché sur les prospects entrants) avec un motif « entreprise ». **Pas de prix**, pas de détail technique, et aucune promesse d'une fonction d'équipe tant que les organisations multi-membres (prompt 3) ne sont pas livrées : on dit « nous l'intégrons pour vous », pas « cliquez ici pour inviter votre équipe ».
- **Pour qui (décision de Benj, 01/11)** : artisans du bâtiment, TPE du bâtiment, artisans multi-chantiers, **architectes** et entreprises qui veulent industrialiser leur gestion. Les artisans restent le cœur de la page et de l'offre en libre-service ; les architectes et les entreprises sont orientés vers « Presti pour l'entreprise ».
- **White-label** : la landing est la seule surface qui dit « Presti ». Les sites et pages des artisans (`/site`, `/p`) ne sont pas concernés et n'affichent jamais la marque.

### 4. Le texte

Écrit pour un artisan, pas pour un informaticien : phrases courtes, verbes concrets, aucun mot technique (IA générative, agent, workflow, LLM, automatisation « intelligente »). Chaque chiffre a une source au fichier:ligne ou disparaît. Pas de faux témoignage, pas de faux logo client, pas de compteur inventé. Toute maquette d'artisan fictif porte « Exemple. ». La démo ne montre que des gestes qui existent dans le code aujourd'hui.

### 5. Performance, accessibilité, SEO

- Mesure avant et après (Lighthouse mobile et ordinateur) : la note du 18/10 relève un temps de blocage (TBT) de 950 ms sur ordinateur et 2 900 ms sur mobile. Objectif : TBT sous 200 ms sur mobile, LCP sous 2,5 s, CLS sous 0,1. Pas de WebGL au chargement ; animations en CSS et JavaScript léger, chargées après l'affichage.
- Contraste WCAG AA, navigation au clavier, textes alternatifs, `prefers-reduced-motion`.
- SEO : titre, description, Open Graph, données structurées (`SoftwareApplication`, `FAQPage`), plan du site, une seule balise `h1`.

### 6. Méthode

1. Inventaire de la page actuelle et des 12 fichiers non commités.
2. Maquette de la nouvelle structure (texte et croquis des 7 sections), validée par Benj avant le code. Tu peux t'inspirer de références (connecteur MotionSites, facultatif), sans en copier le décor.
3. Construction derrière le drapeau `landingV2` (ou celui qui existe déjà), l'ancienne page restant la page publique tant que Benj n'a pas dit oui.
4. `npm run build` en local, push, `node scripts/attendre-deploiement.mjs`, vérification en direct (routes 200, DOM et CSS inspectés, mobile et ordinateur), captures avant et après.
5. Audit par un sous-agent distinct (promesses, accessibilité, performance), puis levée du drapeau sur le « oui » de Benj.

### 7. Tests

Hors ligne, capables de rougir, inscrits au lanceur `scripts/tout-verifier.mjs` : 7 sections au plus ; aucun prix écrit en dur (tout vient de `lib/plans.ts`) ; aucune promesse interdite (liste §2) ; aucun bleu ni cyan dans les styles de la page ; un seul `h1` ; liens et boutons fonctionnels ; la page publique reste l'ancienne tant que le drapeau est baissé.

### 8. Première réponse attendue

1. L'inventaire de la page actuelle, de la branche `refonte-1018` et des fichiers non commités.
2. La structure proposée en 7 sections, avec le message de chacune et ce qui part sur `/offres`.
3. Les questions encore ouvertes, avec un défaut (fond, bloc entreprise, architectes et fichiers non commités sont tranchés le 01/11).
4. Les mesures Lighthouse de départ.

### Definition of Done

- 7 sections au plus, une promesse claire en 5 secondes, un seul appel à l'action principal.
- Aucun prix en dur, aucune promesse interdite, aucun chiffre sans source.
- TBT mobile sous 200 ms, accessibilité AA, SEO en place.
- Déployé derrière un drapeau, vérifié en direct, levé seulement sur le « oui » de Benj. 

<pasted_content id="8bb5">
