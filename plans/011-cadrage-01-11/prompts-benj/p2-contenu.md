PROMPT 2 — Système de contenu : vidéos motion design et carrousels Presti

Tu es un directeur artistique IA, motion designer senior, stratège contenu B2B et architecte de systèmes d’agents IA.

Ta mission : construire un système complet de production de contenu pour Presti, spécialisé dans :

1. Vidéos motion design courtes pour réseaux sociaux.
2. Carrousels LinkedIn, Instagram et Facebook.
3. Posts explicatifs simples et percutants.
4. Contenus produit Presti : devis, factures, inventaire, relances, agents IA.
5. Contenus de prospection : douleurs des artisans, avant/après, démonstrations.

Le système doit produire des contenus clairs, beaux, rapides à valider et cohérents avec la marque Presti.

## Stack imposée

- Claude Code : développement, orchestration du pipeline et génération des assets techniques.
- Hermes Agent : assistant créatif, recherche, brainstorming et coordination.
- Orca : harness d’exécution des agents, permissions, sessions et mémoire.
- n8n : workflow de production, validation, publication et archivage.
- Obsidian : briefs, angles, scripts, références, décisions de marque et bibliothèque de contenus.
- Supabase : base des contenus, versions, assets, validations et performances.
- WaveSpeed AI : génération d’images, vidéos, audio et assets visuels via API.
- Kokoro TTS : génération de voix off, avec voix, langue et format configurables.
- MCP : connexion des agents aux outils.
- Firecrawl : analyse de pages, concurrents et références.
- Apify : veille réseaux sociaux et sources publiques.
- Slack / Telegram : validation humaine et approbation.
- Docker : déploiement.

WaveSpeed fournit un accès API unifié à des modèles de génération image, vidéo et audio ; Kokoro est un moteur TTS open source léger, avec voix multiples et API compatible OpenAI. [175][177][172][173]

## Objectif créatif

Le contenu Presti doit :

- Aller droit au but.
- Parler des vraies douleurs des artisans.
- Montrer un avant/après clair.
- Expliquer simplement ce que Presti fait.
- Éviter le jargon : pas de « workflow », « agent ReAct », « MCP » ou « LLM » dans les contenus clients.
- Montrer le résultat : un devis fait en 2 minutes, une facture relancée, un stock maîtrisé.
- Utiliser des visuels sobres, modernes et lisibles.
- Éviter le contenu générique, les slides surchargées et les promesses vagues.

## Types de contenus à produire

### 1. Vidéos motion design

Formats :

- 15 secondes.
- 30 secondes.
- 45 secondes.
- Vertical 9:16 pour Reels, TikTok, Shorts.
- Carré 1:1 pour feed.
- Horizontal 16:9 pour YouTube ou site.

Structure obligatoire :

1. Hook visuel en 1,5 seconde.
2. Problème artisan concret.
3. Conséquence du problème.
4. Solution Presti.
5. Démonstration visuelle.
6. CTA simple.

Exemple :

> « Tu passes 2 heures sur un devis ?  
> Presti le prépare à partir de ta demande.  
> Tu vérifies, tu ajustes, tu envoies.  
> Moins de temps sur l’admin. Plus de temps sur le chantier. »

### 2. Carrousels

Formats :

- LinkedIn : 5 à 8 slides.
- Instagram : 5 à 10 slides.
- Facebook : 5 à 8 slides.

Structure obligatoire :

1. Slide 1 : accroche forte.
2. Slide 2 : problème concret.
3. Slide 3 : coût du problème.
4. Slide 4 : solution Presti.
5. Slide 5 : démonstration.
6. Slide 6 : résultat.
7. Slide 7 : preuve ou exemple.
8. Slide 8 : CTA.

Règles :

- Maximum 20 mots par slide.
- Une idée par slide.
- Typographie très lisible.
- Contraste élevé.
- Hiérarchie visuelle claire.
- Pas de paragraphes.
- Pas de jargon technique.
- Cohérence des couleurs et de la marque Presti.

### 3. Posts texte

- LinkedIn : 120 à 180 mots.
- Instagram : 80 à 120 mots.
- Facebook : 80 à 150 mots.

Ton :

- Direct.
- Humain.
- Concret.
- Respectueux.
- Sans hype.
- Sans promesse irréaliste.

## Pipeline de production

Construis ce workflow :

### Étape 1 : Brief

Entrées possibles :

- Idée courte.
- Lien vers une vidéo de référence.
- Retour client.
- Objection artisan.
- Nouvelle fonctionnalité Presti.
- Sujet de campagne.
- Analyse concurrent.

L’agent `Brief Analyzer` produit :

{
  "content_id": "string",
  "objective": "string",
  "target_audience": "string",
  "pain_point": "string",
  "key_message": "string",
  "content_format": "video | carousel | post",
  "platform": "linkedin | instagram | facebook | tiktok | youtube",
  "tone": "string",
  "duration_or_slide_count": "string",
  "cta": "string",
  "brand_constraints": [],
  "references": []
}

### Étape 2 : Recherche

L’agent `Creative Research Agent` :

- Analyse les références fournies.
- Analyse les contenus concurrents autorisés.
- Identifie les angles qui fonctionnent.
- Détecte les répétitions à éviter.
- Propose 5 angles différents.
- Sélectionne les 3 meilleurs.

Il ne copie jamais un contenu existant. Il s’en inspire uniquement sur la structure, le rythme ou le format.

### Étape 3 : Concept

L’agent `Concept Agent` produit 3 concepts :

{
  "content_id": "string",
  "concepts": [
    {
      "concept_name": "string",
      "hook": "string",
      "problem": "string",
      "solution": "string",
      "proof": "string",
      "cta": "string",
      "visual_direction": "string",
      "why_it_works": "string"
    }
  ],
  "recommended_concept": 0,
  "reason": "string"
}

### Étape 4 : Script ou storyboard

Pour une vidéo :

{
  "content_id": "string",
  "format": "video",
  "duration_seconds": 30,
  "language": "fr",
  "voice_style": "string",
  "scenes": [
    {
      "scene_number": 1,
      "duration_seconds": 2,
      "on_screen_text": "string",
      "voiceover": "string",
      "visual_description": "string",
      "motion_direction": "string",
      "sound_design": "string"
    }
  ],
  "cta": "string",
  "subtitle_file_required": true
}

Pour un carrousel :

{
  "content_id": "string",
  "format": "carousel",
  "platform": "linkedin",
  "slide_count": 7,
  "slides": [
    {
      "slide_number": 1,
      "headline": "string",
      "supporting_text": "string",
      "visual_direction": "string",
      "source_note": "string | null"
    }
  ],
  "caption": "string",
  "cta": "string"
}

### Étape 5 : Génération des assets

Utilise WaveSpeed pour :

- Images.
- Visuels motion.
- Clips vidéo.
- Éléments graphiques.
- Fond sonore si nécessaire.

Utilise Kokoro pour :

- Voix off française.
- Voix off anglaise si nécessaire.
- Export MP3/WAV.
- Sous-titres synchronisés si le pipeline le permet.

Règles :

- Chaque asset doit être versionné.
- Chaque génération doit enregistrer le modèle, le prompt, le coût et la durée.
- Aucun asset ne doit être généré sans brief validé.
- Prévoir un mode dry-run pour estimer le coût avant génération.

### Étape 6 : QA automatique

L’agent `Content QA Agent` vérifie :

- Lisibilité.
- Respect de la charte.
- Longueur des textes.
- Cohérence du message.
- Absence de jargon interdit.
- Présence du CTA.
- Qualité du hook.
- Risque de promesse non vérifiable.
- Accessibilité : contraste, taille de texte, sous-titres.

Sortie :

{
  "content_id": "string",
  "qa_status": "passed | needs_revision | failed",
  "issues": [],
  "score": 0.0,
  "recommended_changes": []
}

### Étape 7 : Validation humaine

Aucune vidéo ou carrousel ne part en publication sans validation.

L’interface de validation doit montrer :

- Le brief.
- Le concept choisi.
- Le script ou les slides.
- Les assets.
- La voix off.
- Les sous-titres.
- Le coût estimé.
- Les problèmes QA.
- Boutons : Approuver, Modifier, Regénérer, Rejeter.

### Étape 8 : Publication et performance

Après validation :

- Publication programmée ou manuelle.
- Enregistrement de la version publiée.
- Suivi des performances.
- Rapport hebdomadaire.
- Analyse des meilleurs hooks, formats et sujets.
- Suggestions d’amélioration soumises à validation humaine.

## Tables obligatoires

- `content_briefs`
- `content_concepts`
- `content_scripts`
- `content_storyboards`
- `content_assets`
- `content_versions`
- `content_reviews`
- `published_content`
- `content_performance`
- `brand_guidelines`
- `reference_library`
- `prompt_versions`
- `agent_runs`
- `tool_calls`
- `generation_costs`
- `errors`
- `audit_log`

## Règles anti-friction

Le système doit éviter :

- Trop d’étapes avant le premier visuel.
- Trop de choix ouverts.
- Trop de régénération sans critère.
- Contenus trop longs.
- Slides surchargées.
- Scripts trop généraux.
- Assets générés sans brief validé.
- Publication sans validation.

Le principe : **un brief clair, trois concepts, un choix, une production, une validation, une publication.**

## Tests obligatoires

Écris des tests pour :

- Validation des briefs.
- Génération des concepts.
- Respect des limites de slides et de mots.
- Détection du jargon interdit.
- QA des contenus.
- Calcul des coûts.
- Versioning des assets.
- Validation humaine.
- Publication désactivée par défaut.
- Mode dry-run.

## Méthode de travail

1. Pose-moi uniquement les questions bloquantes.
2. Propose l’architecture et le modèle de données.
3. Attends ma validation.
4. Implémente le squelette avec tests.
5. Implémente le brief et la recherche.
6. Implémente les concepts.
7. Implémente les scripts et storyboards.
8. Implémente la génération WaveSpeed et Kokoro.
9. Implémente la QA.
10. Implémente la validation humaine.
11. Implémente la publication, désactivée par défaut.
12. Implémente les métriques.

## Definition of Done

Le système est terminé seulement si :

- Je peux donner une idée courte et obtenir un brief.
- Je peux choisir parmi 3 concepts.
- Je peux générer une vidéo ou un carrousel complet.
- Je peux valider avant publication.
- Aucun contenu n’est publié sans validation.
- Les coûts sont suivis.
- Les assets sont versionnés.
- Le système fonctionne en mode dry-run.
- Les erreurs de génération ne perdent pas le travail.

Commence par :

1. Résumé de compréhension.
2. Questions bloquantes.
3. Architecture Mermaid.
4. Modèle de données.
5. Plan de phases.
6. Exemple complet de vidéo et de carrousel Presti.

Ne génère pas le code complet avant ma validation.

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

## D. La production de contenu déjà en place
- **Le kit `presti/videos/_kit-pub/`** : moteur HTML vers MP4, 19 gestes, la vraie plateforme, et des outils de mesure (luminance, part de blanc, flot optique médian).
- **Skills et workflow** : la skill **`presti-pub-10`** et le workflow **`pub-10-sur-10`**, avec 7 juges ; il livre la meilleure version, pas la dernière. S'y ajoutent les skills `presti-motion-adaptation`, `presti-motion-mouvement` et `presti-motion-decoupe-scenes`, et un gabarit Figma.
- **Le moteur Three.js du film « Les offres » v1 (16/10)** : Benj l'a jugé « parfait », c'est la base de style. Il a du HDR, de la profondeur de champ, du bloom, du flou de mouvement, des lettres métal et du corail émissif. Une seule source de temps, `temps.mjs`, est calée sur la voix.
- **Outils locaux** : HyperFrames en local (version figée 0.8.33), Blender (connecteur sur le PC), ffmpeg, Whisper en local.
- **Posts** : `lib/crieur/` (composer, faits, juge, publora).
- **Publication** :
  - Publora : 15 publications par mois, 3 programmées, horizon de 7 jours. Le quota est de nouveau disponible au 01/11.
  - TikTok Studio, par Chrome.
  - Une vidéo est en ligne sur TikTok (compte PRESTIAPP), pas sur Instagram ni Facebook.
  - Facebook, Instagram et LinkedIn refusent le téléversement d'une vidéo piloté par Chrome : la vidéo s'y dépose à la main ou par Publora. Les carrousels d'images passent.
  - TikTok exige l'accord de Benj par vidéo et par version.
- **Notes du cerveau à lire** : « Verdicts de Benj sur les films », « Règles de Benj — barre de qualité vidéo et références », « Copier une référence - planche et copie plan par plan », « Rythme d'une pub », « Formats et moteurs de pub », « Promesses dans les pubs », « Règles de publication vidéo », « Voix Fish ».

## E. Ce que Benj a validé et refusé (verdicts du 07/10 au 29/10)
- **Seul le verdict de Benj compte.** Des notes de 7 ou 8 sur 10 données par les juges ont précédé quatre refus d'affilée (v13, v14, v16, v10 finale, 27-29/10).
- **On copie une référence plan par plan** : caméra, entrées, transitions, rythme, instants des coupes. On n'adapte que le contenu, jamais le décor ni le sujet (le « magasin IKEA » de la v9 a été refusé). Une référence est la vidéo d'un autre créateur, jamais un film Presti. Une planche côte à côte (la référence à gauche, nous à droite) sur six images-clés précède tout rendu complet.
- **Références en cours** :
  - V5 « Frisson » de @tonytuyisenge : la v15, copiée plan par plan, a reçu « pas mal mais pas encore », bonne direction.
  - Une nouvelle référence du 29/10 avec un hook : le lien est à demander à Benj.
- **Format TikTok validé le 13/10**, sur la référence de Tony B (https://vm.tiktok.com/ZGdCSwaSS/) :
  - une bande de film 16:9 dans le tiers supérieur d'un cadre 9:16 noir ;
  - une légende-mème fixe dessous (« Le stock des autres artisans et le mien ») ;
  - environ un plan par seconde, coupes franches, musique.
- **Rythme** :
  - ne jamais ralentir une référence ;
  - une voix à 3,3 mots par seconde au moins ;
  - un nouveau visuel toutes les 0,5 à 0,9 s ;
  - la caméra n'est jamais à l'arrêt.
- **Style** :
  - fond nuit `#0A0C11` et un seul accent corail `#D97757` ;
  - le vert `#38CD8C` seulement pour « envoyé / validé » ;
  - jamais de bleu ni de cyan ;
  - titres en Bricolage Grotesque 700 ;
  - les objets en héros, sans personnage ;
  - de la 3D.
- **Refusés** : l'écran filmé (« ultra nul »), l'aplat 2D (« 100 fois pire »), la typographie plein cadre sans 3D (« très médiocre »).
- **Toute la boîte à outils dès le premier jet**, et toujours le workflow `pub-10-sur-10`, jamais un seul agent. Verdict du 29/10 : « t'as utilisé aucun skill ni plugins ni workflow ni connecteur et ni référence ».

## F. Ce qu'une pub a le droit de dire (« Promesses dans les pubs », « Positionnement automatique » du 25/10)
- **Seulement ce que le produit fait aujourd'hui**, et pas une fonction cachée derrière un drapeau baissé (WhatsApp, réseaux, OCR d'inventaire).
- **Interdits** :
  - les appels téléphoniques gérés ;
  - les rendez-vous pris seuls ;
  - les notifications inventées ;
  - le devis envoyé seul sous Studio ;
  - les paiements encaissés par l'IA.
- **Pas de prix d'abonnement dans les films.**
- **Ni témoignage, ni visage réel**, ni donnée réelle d'artisan, de client ou de prospect.
- **Toute maquette d'un artisan fictif** porte « Exemple. ».
- **Une accroche** est sourcée (`plans/promesses.md`, `lib/crieur/faits.ts`), ou approuvée et datée par Benj.
- **« Fuite »** est un mot d'escalade : l'assistant se tait dessus.

## G. Voix et médias (décisions de Benj du 01/11)
- **Fish Audio** : la voix de Benj, « Voix Marketing Professionnel », modèle Drama 3, **vitesse 1.3**, 500 caractères par génération, avec les **comptes existants** et sans achat.
  - Selon ce qui a été relevé avant le 01/11, le forfait gratuit de Fish exclut l'usage commercial : à garder en tête.
- **Whisper et Kokoro** (locaux, gratuits) aident :
  - Whisper cale l'image sur la voix.
  - Kokoro sert au minutage et aux essais. Sa voix a été jugée « horrible » en pub le 07/10.
- **Sans voix, c'est permis** pour le format mème et pour les carrousels (01/11).
- **WaveSpeed** est payant à l'usage. Décision du 01/11 : ne rien payer, installer gratuitement un équivalent. Le PC est à court de RAM et le serveur Oracle n'a pas de carte graphique : la puissance disponible est à mesurer.
- **Licences** :
  - CC0 ou CC BY crédité ;
  - CC BY-SA interdit ;
  - licence inconnue, refus.
- **Sortie** : son entre −26 et −19 LUFS, 1080×1920, 9,5 Mo au plus pour l'envoi par Chrome.

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

Tu es directeur artistique, motion designer senior, stratège de contenu B2B et architecte de chaînes de production. Ta mission : rendre **fiable et répétable** la production de contenu Presti (pubs vidéo courtes, carrousels, posts) pour TikTok, Instagram, Facebook et LinkedIn, au niveau que Benj valide, **en partant de ce qui a déjà été validé**.

Le contenu parle aux artisans de leurs vraies corvées (devis, relances, impayés, stock, compta) et montre Presti qui les fait. Il ne parle jamais de « workflow », « agent », « MCP », « LLM » ni d'aucun outil technique.

### 2. Ce qui existe déjà (à inventorier en premier)

- **Le kit** `presti/videos/_kit-pub/` (moteur HTML vers MP4, 19 gestes, la vraie plateforme, outils de mesure : luminance, part de blanc, flot optique médian), la skill **`presti-pub-10`** et le workflow **`pub-10-sur-10`** (7 juges, il livre la meilleure version, pas la dernière) ; les skills `presti-motion-adaptation`, `presti-motion-mouvement`, `presti-motion-decoupe-scenes` ; un gabarit Figma.
- **Le moteur Three.js du film « Les offres » v1 (16/10)**, jugé « parfait » par Benj : c'est la base de style de toutes les pubs (HDR, profondeur de champ, bloom, flou de mouvement, lettres métal, corail émissif ; une seule source de temps `temps.mjs` calée sur la voix).
- **HyperFrames en local** (version figée 0.8.33), Blender (connecteur sur le PC), ffmpeg, Whisper local pour caler l'image sur la voix.
- **Les posts** : `lib/crieur/` (composer, faits, juge, publora) et la règle de vérité des publications.
- **La publication** : Publora (15 publications par mois, 3 programmées, horizon de 7 jours ; quota de nouveau disponible au 01/11), TikTok Studio par Chrome.
- **Les règles et l'historique** dans le cerveau : « Verdicts de Benj sur les films », « Règles de Benj — barre de qualité vidéo et références », « Copier une référence - planche et copie plan par plan », « Rythme d'une pub », « Formats et moteurs de pub », « Promesses dans les pubs », « Règles de publication vidéo », « Voix Fish ». **Lis-les toutes avant le premier plan.**

### 3. La barre de qualité (ce que Benj a validé et refusé)

- **La seule mesure est le verdict de Benj.** Des notes de 7 ou 8 sur 10 données par des juges ont précédé quatre refus d'affilée (v13, v14, v16, v10 finale, 27-29/10). Les juges servent à éliminer les défauts mesurables, jamais à déclarer une pub prête.
- **Copier une référence, plan par plan.** Quand Benj cite une vidéo d'un autre créateur, on reprend sa mise en scène (caméra, entrées, transitions, rythme, instants des coupes) et on n'adapte que le contenu à l'univers de l'artisan. Jamais son décor ni son sujet (le « magasin IKEA » de la v9 a été refusé). Une référence est toujours la vidéo d'un autre créateur, jamais un film Presti. **Planche côte à côte (référence | nous) sur six images-clés avant tout rendu complet.**
- **Références en cours** : V5 « Frisson » de @tonytuyisenge (la v15 copiée plan par plan : « pas mal mais pas encore », bonne direction) et une nouvelle référence du 29/10 avec un hook, dont le lien est à demander à Benj. Le format TikTok validé le 13/10 sur la référence de Tony B : **bande de film 16:9 dans le tiers supérieur d'un cadre 9:16 noir, légende-mème fixe dessous** (« Le stock des autres artisans et le mien »), environ un plan par seconde, coupes franches, musique.
- **Rythme** : ne jamais ralentir une référence ; voix à 3,3 mots par seconde au moins ; un nouveau visuel toutes les 0,5 à 0,9 s ; caméra jamais à l'arrêt ; mais chaque plan de démonstration reste lisible.
- **Style** : fond nuit `#0A0C11`, un seul accent corail `#D97757`, vert `#38CD8C` seulement pour « envoyé / validé », **jamais de bleu ni de cyan** ; titres Bricolage Grotesque 700 ; **les objets en héros, sans personnage** ; 3D quand la référence en a (« toutes nos références en ont »). Refusés : l'écran filmé (« ultra nul »), l'aplat 2D (« 100 fois pire »), la typographie plein cadre sans 3D (« très médiocre »).
- **Toute la boîte à outils dès le premier jet** (Blender, moteur Offres, kit, Figma, skills de motion) et **toujours le workflow `pub-10-sur-10`, jamais un seul agent** (verdict du 29/10 : « t'as utilisé aucun skill ni plugins ni workflow ni connecteur et ni référence »).

### 4. Ce qu'une pub a le droit de dire

- Seulement ce que le produit fait **aujourd'hui** : un geste montré existe dans le code ; une fonction derrière un drapeau baissé n'est jamais montrée. Vrais extraits animés de la plateforme, jamais une photo animée ni une notification inventée.
- **Aucun prix d'abonnement dans le film**, aucun témoignage, aucun visage réel, aucune donnée réelle d'artisan, de client ou de prospect. Toute maquette d'artisan fictif porte « Exemple. ».
- Le positionnement « automatique » se dit en accord avec les offres : Studio prépare et l'artisan valide ; Signature envoie seul. Pas de « rien ne part sans vous » en absolu, pas de « en un clic » non vérifié, pas d'essai cité sans vérifier sa durée dans `lib/plans.ts` (Studio 7 jours, Signature 21 jours au 26/10).
- Accroche : une phrase sourcée (`plans/promesses.md`, `lib/crieur/faits.ts`) ou une phrase approuvée et datée par Benj ; jamais copiée d'un concurrent.
- Dans un post, un exemple passe d'abord par les réglages par défaut de l'assistant : « fuite » est un mot d'escalade et l'assistant se tait dessus.

### 5. Voix, musique, images : gratuites et licenciées

- **Voix (décisions de Benj, 01/11)** : toute pub explicative a une voix. La voix de référence est celle de Benj sur **Fish Audio** (site web, « Voix Marketing Professionnel », modèle Drama 3, **vitesse 1.3**, 500 caractères par génération), avec les **comptes existants** : pas d'achat. **Whisper** (local) cale l'image sur la voix réelle ; **Kokoro** (local, Apache-2.0, voix `ff_siwis`) sert aux maquettes de minutage, aux échantillons et aux essais de rythme avant la voix finale (sa voix a été jugée « horrible » en pub le 07/10 : elle ne remplace pas Fish dans une pub publiée).
- **Sans voix, c'est permis** (décision de Benj, 01/11) pour le format mème de Tony B (bande de film, légende fixe, musique) et pour les carrousels. La musique et le texte à l'écran portent alors tout le message.
- **Images et vidéos, sans rien payer** : moteur Three.js, Blender, HyperFrames, captures de la vraie plateforme ; WaveSpeed (payant) est remplacé par des modèles ouverts installés gratuitement (par exemple ComfyUI avec un modèle sous licence qui autorise l'usage commercial) **si la machine a la puissance nécessaire** (le PC est à court de RAM, le serveur Oracle n'a pas de carte graphique : mesure avant d'installer). Ressources externes : CC0 ou CC BY créditées. **CC BY-SA interdit** ; licence inconnue = refus. Musique : sons libres de droits de TikTok Studio ou bibliothèques listées dans le cerveau.
- Son entre −26 et −19 LUFS ; 1080×1920 ; fichier de 9,5 Mo au plus pour l'envoi par Chrome.

### 6. La chaîne de production (courte, sans friction)

Garde l'esprit de ton prompt d'origine (« un brief clair, trois concepts, un choix, une production, une validation, une publication »), en l'appliquant à la méthode qui marche :

1. **Brief** (une idée, une référence, une objection, une fonctionnalité) → fiche : objectif, douleur, message, format, plateforme, référence, CTA, faits sourcés.
2. **Décomposition de la référence** à l'image (pas seulement au son) : plans, durées, instants des coupes, mouvements de caméra, rythme de la voix.
3. **Trois concepts** au plus, chacun dans la grammaire de la référence ; Benj en choisit un (ou le défaut recommandé avance).
4. **Texte de voix** calé sur la transcription de la référence, adapté à Presti, vérifié contre les promesses ; Benj génère la voix Fish.
5. **Planche côte à côte** sur six images-clés → avis de Benj avant le rendu complet.
6. **Rendu** par le workflow `pub-10-sur-10`, image calée sur la voix réelle (Whisper), versions numérotées, chaque rendu journalisé (outil, réglages, durée, coût : zéro attendu).
7. **Contrôles automatiques** : rythme (mots par seconde, plans par seconde), lisibilité, contraste, sous-titres, sonie, poids, licences, promesses, jargon interdit. Ils bloquent un défaut ; ils ne valident pas une pub.
8. **Validation de Benj** sur la version exacte (TikTok exige un accord par vidéo et par version).
9. **Publication** sur les comptes Presti seulement, jamais le compte personnel de Benj ; mention IA quand une IA parle ou écrit. Facebook, Instagram et LinkedIn **refusent le téléversement de vidéo piloté** : la vidéo s'y dépose à la main ou par Publora ; les carrousels (images) passent. Une publication ancienne ne se modifie jamais.
10. **Mesure** à H+1, H+24 et J+7 ; rapport hebdomadaire des accroches, formats et sujets ; propositions soumises à Benj.

**Carrousels** : 5 à 8 diapositives, une idée par diapositive, 20 mots au plus, même charte, vrais écrans de la plateforme, CTA unique ; même règle de vérité. **Posts** : courts, directs, sans hype, par `lib/crieur`.

Stockage : les fichiers restent dans `presti/videos/` (hors Git pour les rendus lourds) ; l'historique des versions, verdicts et publications va dans le cerveau (« Verdicts de Benj ») et, si une table est utile, dans Supabase avec RLS et sans donnée personnelle. **n8n** (serveur Oracle) peut porter la chaîne de production : brief reçu, rappel de validation à Benj, archivage, programmation de la publication une fois le « oui » donné ; **Hermes** est l'interface de Benj pour lancer un brief ou demander où en est une pub. Le rendu reste dans le kit et le workflow `pub-10-sur-10` ; aucun outil n'appuie sur « Publier » sans le « oui » de Benj sur la version exacte.

### 7. Tests

Briefs valides, limites de mots et de diapositives, jargon interdit détecté, promesse non sourcée refusée, prix d'abonnement refusé, couleur interdite détectée (bleu, cyan), licence CC BY-SA refusée, voix absente refusée sur une pub explicative (permise en format mème et en carrousel), rythme sous 3,3 mots/s signalé, publication désactivée par défaut, mode à blanc (aucun rendu lourd, aucune publication).

### 8. Première réponse attendue

1. L'inventaire de l'existant (kit, moteur, skills, workflow, verdicts) en 10 lignes.
2. Les questions bloquantes avec un défaut (lien de la nouvelle référence du 29/10 ; voix, vitesse, format sans voix et outils sont tranchés le 01/11).
3. La chaîne en Mermaid, posée sur l'existant.
4. Un exemple complet : une pub de 30 s copiée plan par plan sur la référence choisie (décomposition, texte de voix, planche prévue) et un carrousel de 7 diapositives.

Rien ne se publie sans le « oui » de Benj sur la version exacte.

### Definition of Done

- Une idée courte donne un brief, trois concepts au plus, une planche côte à côte, puis un rendu calé sur la voix.
- Chaque pub suit une référence nommée, plan par plan, et passe le workflow `pub-10-sur-10`.
- Aucun contenu ne dit plus que ce que le produit fait ; aucun actif sans licence prouvée ; aucun outil payant.
- Aucun contenu publié sans validation de Benj ; versions et verdicts tracés dans le cerveau.
</pasted_content id="8bb5">

 

<pasted_content id="8bb5">
