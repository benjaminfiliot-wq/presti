# Organigramme de l'écosystème Presti (27/09/2026)

> Demande de Benj : « on ne parle que de Matt, alors qu'il doit y avoir beaucoup d'autres personnes ». Ce document dresse la liste de **toutes** les « personnes » de l'écosystème : qui fait quoi, avec quelle IA, dans quelle salle de la station, avec quelles limites, et à qui elle rend compte.
> Écrit en lecture seule le 27/09 au soir (état des files relevé vers 22 h 15). Rien n'a été modifié dans `presti`. Ni `presti-secrets` ni `.env.local` n'ont été lus.
> Sources : `.orchestre/brouillons-ecosysteme/026/` (INDEX, fiches, `reprises-2026-09-27.md`), `.orchestre/fait`, `en-cours`, `refuse`, `verdicts.jsonl`, `docs/agents/` (chef, chef-routine, chef-reunion, revue-hebdo, chantier, usine), `SaaS/Produit/Ecosysteme-Plan-2026-09-24.md` (agents A0 à A14), `Ecosysteme-Rectification-2026-09-24.md` §3.3, `Ecosysteme-IA-Registre-2026-09-25.md` (§1, §2, §6), `Ecosysteme-Interface-Poste-2026-09-24.md` §3.2 (les 20 salles), `reprise-cloud/memoire/ecosysteme-presti.md` (OpenClaw, 26/09).

---

## En bref

1. **L'écosystème compte 30 postes**, sans compter Benj ni Claude Code : Matt, 23 agents d'opérations, 3 routines du bureau de Claude Code, et 3 « employés » hors équipage. S'y ajoutent **13 sous-agents** de Claude Code (à la demande, PC allumé) et **5 exécutants** qui fabriquent le code.
2. **Trois listes ne se recoupent pas.** La base (`ops.agents`) connaît **20** identités. La station (`EQUIPAGE`, 026-070) montre **18** personnages. Le plan en décrivait **15** (A0 à A14). Quatre identités de la base n'ont pas de personnage, deux personnages n'ont pas d'identité, et quatre équipes (douleurs, pubs, Studio, contenu) n'ont ni l'un ni l'autre (section 7).
3. **La plupart des agents n'ont pas d'IA.** Sur 23 agents d'opérations, **7 seulement** appellent un modèle de langage : le Standard, le Facteur (son second juge), le Rédacteur des sites, la Vigie Meta (sa veille), le Studio, la veille des douleurs et la veille des tendances du service contenu. Laya, modèle local de décision, vérifie en plus les chiffres du Crieur et du service contenu. Les autres sont du code sous juges. C'est voulu : un modèle ne rédige jamais un message à un prospect, il classe ou il juge.
4. **Matt ne commande personne.** Il lit l'état du bus, écrit des tâches et des questions. Toutes ses tâches partent au pont, donc à Claude Code. Il ne peut ni mettre en pause, ni relancer, ni régler un agent. C'est un directeur qui observe et propose.
5. **Presque tout est encore en brouillon.** Sur les 228 fiches de la série 026 : 39 faites (dont 8 à reprendre ou rouvertes, et 026-039 dont le dernier verdict rejoué est rouge), 6 en cours, 2 refusées, 181 en brouillon. Aucun agent d'opérations ne tourne encore pour de vrai.
6. **12 postes manquent** pour faire une vraie entreprise (section 6) : en tête, la comptabilité, le service client après la vente et la qualité des sites livrés.

**Comment lire les états des fiches** : « faite » = dans `.orchestre/fait` ; « en cours » = dans `en-cours` ; « refusée » = dans `refuse` ; « brouillon » = seulement dans `brouillons-ecosysteme/026`. « À reprendre » et « rouverte » viennent de `reprises-2026-09-27.md` et de l'INDEX (l.797-810).

---

## 1. L'arbre

```
BENJ — propriétaire
│   appels, argent, accords, secrets de ses comptes, ouverture de l'envoi à froid, pause
│
└── CLAUDE CODE — chef d'entreprise (PC)
    │   pense, tranche, écrit les juges, applique les migrations, arbitre, pousse
    │
    ├── Bureau de Claude Code (PC allumé seulement)
    │   ├── Revue du lundi (A11) ............ routine Claude Code
    │   ├── Chantier (A12) .................. routine Claude Code
    │   ├── Pont de l'orchestre (pont) ...... salle Chantier du code
    │   ├── Exécutants : Codex (usine, PC), Antigravity, Cursor, Gemini CLI, Qwen Code
    │   └── Cabinet : 13 sous-agents presti-* (audit, animation, gestion, mails, IA)
    │
    └── MATT — directeur des opérations (usine Oracle, 24 h/24) ... salle Commandement
        │
        ├── Veille et prospection ........................ salles Radar, Rédaction
        │   ├── Vigie Meta (A7, vigie_meta)
        │   ├── Recenseur (A8, recenseur)  [+ le Récupérateur, module réseau]
        │   ├── Juge des faits (J1, juge_faits)
        │   └── Veille des douleurs (douleurs)  — sans personnage
        │
        ├── Messages sortants ............................ salles Rédaction, Envois
        │   ├── Plume (A1, redacteur)
        │   ├── Garde (J3, garde) et le second juge
        │   ├── Facteur (facteur) — le seul qui approuve un envoi
        │   └── Porteur du formulaire (facteur_usine)  — sans personnage
        │
        ├── Relation prospects ........................... salle Standard
        │   ├── Standard (A3, standardiste)
        │   └── Répondeur (repondeur)
        │
        ├── Fabrication .................................. salles Atelier, Usine à sites, Studio
        │   ├── Atelier des maquettes (A2, atelier_maquettes)
        │   ├── Rédacteur des sites (A4 v2, redacteur_site)
        │   ├── Livreur de sites (A4, livreur + livreur_usine)
        │   ├── Atelier pubs locales (A6)  — sans identité propre
        │   └── Studio pubs (A9)  — sans identité propre
        │
        ├── Communication ................................ salle Tour du Crieur
        │   ├── Crieur (A14, crieur)
        │   └── Service contenu (C01 à C16)  — 16 fiches, aucun agent nommé
        │
        ├── Argent ....................................... salle Trésorerie
        │   └── Trésorier (A5, tresorier)  — personnage sans identité en base
        │
        ├── Surveillance ................................. salle des machines
        │   ├── Veilleur (A0, a0)
        │   ├── Surveillance de l'usine (usine)  — sans personnage
        │   ├── Système (systeme)
        │   └── Pont Telegram (pont_telegram)  — sans personnage
        │
        └── Expérience (experience) — fermée avant la première vente .. salle Expérience

HORS ÉQUIPAGE
├── Cerveaux du produit (lib/ai.ts) — répondent aux clients des artisans, 24 h/24, sur Vercel
├── Support (A13) — suspendu (décision D18), aucune fiche
└── OpenClaw — outil confiné sur l'usine (026-221), sans rôle défini
```

**Attention à ce que l'arbre ne dit pas.** Les flèches de Matt vers ses « équipes » sont des flèches de **lecture**, pas de commandement. Les agents tournent sur leurs minuteurs (pg_cron sur Vercel, systemd sur l'usine). Matt voit leurs battements, leurs coûts et leurs cartes, et il en fait un compte rendu. Le seul qui peut arrêter un agent, c'est Benj (la pause, depuis la station ou Telegram) ; le seul qui peut le changer, c'est Claude Code (par une fiche).

---

## 2. Les règles que tout le monde suit

- **Données de prospect ou de client (D1)** : seulement vers Codex (après le geste G3, fait le 25/09) ou vers un modèle local de l'usine. Ollama local ne les recevra qu'après un « oui » explicite de Benj ; Laya est local et ne rédige pas. **Jamais** vers freellmapi, Ollama Cloud, Perplexity, Antigravity, Gemini CLI, Qwen, ElevenLabs. Sans voie permise, la tâche **attend** (ou devient une carte « à lire »).
- **0 €** : tous les plafonds des agents valent 0 € par jour (0105). Seule dépense décidée : Vercel Pro au premier site vendu.
- **Un seul portier d'envoi** : le Facteur. Personne d'autre n'approuve un message à un prospect (0099 l'impose en base).
- **La pause générale** coupe le Facteur, le Répondeur, le porteur, les réponses privées et la messagerie. Quatre voies : station, Telegram (`/pause`), Claude Code par `execute_sql`, variable Vercel. Seul Benj la lève.
- **Aucun agent** ne voit un mot de passe, n'achète, ne crée de compte, ne publie une CGU, ne fusionne une PR.
- **Jetons** : chaque agent de l'usine a son jeton, limité à ses types et à ses tables (026-040), posé par Claude Code sans être affiché (026-050). Aucun n'a la clé de service Supabase ni une clé Stripe.

---

## 3. Les postes, un par un

### 3.1 La direction

#### Benj — le propriétaire
- **Rôle** : il possède l'entreprise ; il prend les appels réservés, reçoit les paiements, tranche les cartes Attention, dit « oui » aux gestes sensibles.
- **Lui seul** : ouvrir l'envoi à froid (station, au plus tôt le 12/10), changer un plafond de palier, lever une pause, créer un compte, poser un secret de ses comptes, approuver une fois les modèles de messages, la notice et les douleurs, fusionner une PR, décider une dépense.
- **Depuis le téléphone** : station et Web Push ; Telegram (`/etat`, `/pause`, `/chef`) ; Remote Control de Claude Code quand le PC est allumé.

#### Claude Code — le chef d'entreprise
- **Rôle** : il pense, tranche, écrit les juges, applique les migrations lui-même, pousse, vérifie le déploiement, arbitre les exécutants.
- **Fiches** : toutes celles marquées `claude-code` (juges, migrations, mises en service, recettes réelles).
- **IA** : Claude Max (Opus pour le jugement, Sonnet et Haiku pour le reste, registre §5). Repli : au-delà de 95 % de la semaine, il ne lance plus rien ; Codex et les exécutants continuent.
- **Limites** : il ne dépense pas, ne crée pas de compte, n'affiche jamais un secret ; il ne fusionne pas les PR de la revue et du chantier.
- **Rend compte à** : Benj.
- **Ne tourne pas PC éteint.**

#### Matt — directeur des opérations (`chef`, A10)
- **Rôle** : toutes les deux heures, il lit l'état de l'entreprise, écrit au plus 10 tâches et 5 questions à Benj, et un compte rendu de trois lignes. À 18 h, il tient la réunion d'équipage et fixe l'objectif.
- **Fiches** : 026-102 (contrat et juge, faite), 026-105 (état et appliquer, faite), 026-127 (cycles plein et léger, brouillon), 026-129 (jour et nuit sur l'usine, brouillon), 026-103 (réunion, brouillon), 026-148 (mise en service 24 h/24, brouillon), 026-151 (mutations, brouillon), 026-226 (passe mensuelle des douleurs, brouillon), 026-227 (lancement d'une expérience, brouillon).
- **IA** : Codex `gpt-6-sol` (cycle plein, réunion) et `gpt-6-luna` (cycle léger), sous le compte `chef-modele`, sans réseau ni secret. Repli (tranché le 27/09, décision 3 ; avant : « `luna`, puis cycle sauté ») : `sol`, puis `luna`, puis Ollama Cloud `gpt-oss:120b-cloud` avec `ops_etat()` pour seule entrée (ni consigne, ni donnée de prospect), puis cycle sauté avec un événement « chef à sec » ; la réunion de 18 h et la file IA des agents n'ont jamais ce secours (026-129, 026-148) ; si l'usine est muette, reprise des mêmes scripts sur le PC (`cycle.mjs --reprise`). Ses entrées sont des chiffres sans nom (D0).
- **Salle** : Commandement ; Salle de réunion à 18 h.
- **Limites** : jamais d'envoi, d'approbation, de dépense, d'achat, de publication, de mise en ligne, de secret, d'adresse, de nom. Huit types de tâches seulement (code, contenu, recherche, tri, veille, vérification, relecture, rédaction interne), toutes `sortante: false`. Une consigne de Benj ne lève jamais une limite. Le défaut d'une question coûte toujours 0 €.
- **Leviers (27/09, décision 3, par fiches de suite)** : poser une pause de sécurité sur un agent (jamais la lever : la reprise reste à Benj ou à Claude Code) et router une consigne adressée à l'agent visé, par le script et non par le modèle (026-074, 026-085, 026-089, 026-117, 026-129).
- **Rend compte à** : Benj (questions dans le Poste, compte rendu dans le fil, Telegram) et Claude Code (ses tâches arrivent en propositions par le pont).
- **Au-dessus de** (décision de Benj du 28/09 : « Matt est le plus gradé ») : le Vigile et tous les postes du bus. Le Vigile ne peut jamais le mettre en pause ; chaque pause de sécurité du Vigile lui remonte (événement du bus), et il peut la contester par une proposition à Claude Code ou à Benj. La levée reste à Benj ou à Claude Code ; ses propres leviers ne changent pas.

### 3.2 Le bureau de Claude Code

#### Revue du lundi (A11)
- **Rôle** : chaque lundi, un bilan de la semaine (entonnoir, argent, coûts, échecs) et trois décisions classées par euros, en PR.
- **Fiches** : 026-121 (juges, faite), 026-146 (scripts, en cours).
- **IA** : Claude Code ; les chiffres viennent d'un script (`revue-donnees.mjs`), jamais du modèle.
- **Salle** : aucune.
- **Limites** : jamais de fusion, aucun connecteur, aucun chiffre inventé ou recalculé.
- **Rend compte à** : Benj (il lit et fusionne ou non).
- **PC éteint** : non aujourd'hui. **27/09** : plus de routine Claude cloud ; elle passe sur l'usine (minuteur du lundi 7 h 30, texte par Matt sur Codex `gpt-6-sol`, chiffres par script, contrôle par `revue-qa.mjs --document`) par la suite « revue et chantier sur l'usine » (026-148).

#### Chantier (A12)
- **Rôle** : une idée que Benj a tranchée « lancer » devient une fiche et son juge, proposés en PR.
- **Fiches** : 026-121 (faite), 026-146 (en cours).
- **IA** : Claude Code (il écrit le juge ; jamais l'exécutant).
- **Salle** : Chantier du code (la file de l'orchestre y est montrée).
- **Limites** : ne fusionne jamais, ne dépose rien dans la file avant la fusion par Benj.
- **Rend compte à** : Benj.
- **PC éteint** : non aujourd'hui. **27/09** : la collecte des idées « lancer » passe sur l'usine (même suite, événement `idee_recue`) ; la fiche et son juge restent au poste, par Claude.

#### Pont de l'orchestre (`pont`)
- **Rôle** : il prend chaque tâche du bus (celles de Matt) et la range en proposition pour Claude Code ; il renvoie les verdicts au bus.
- **Fiches** : 026-142 (juges, brouillon), 026-160 (brouillon).
- **IA** : aucune (code).
- **Salle** : Chantier du code.
- **Limites** : ne lance aucune fiche lui-même.
- **Rend compte à** : Claude Code.
- **PC éteint** : non aujourd'hui (les tâches de Matt attendent le réveil du PC). **27/09** : oui sur l'usine en mode `prendre`, toutes les 15 min, installé par Claude Code après le PASS de 026-160 ; le renvoi des verdicts (mode `verdicts`) reste au poste.

#### Les exécutants
- **Codex** sur l'usine (2 fiches à la fois) et sur le PC (1) : `gpt-6-sol` par défaut, `gpt-6-astra` pour le gros. Secours depuis le 26/09 : Codex sur Ollama Cloud `gpt-oss:120b-cloud`, puis freellmapi (`gpt-oss-120b`, `gemini-3.5-flash`), **pour le code seulement (D0)**.
- **Antigravity** (Gemini) : dormant ; **plus aucune fiche de juges** depuis le 27/09 (trois juges coquilles, 026-026, 026-029, 026-168).
- **Cursor** : 026-222 (brouillon), inactif tant que le coût nul n'est pas prouvé.
- **Gemini CLI, Qwen Code** : câblés, jamais configurés.
- **Orchestre** (l'outil qui les mène) : 026-098, 026-107, 026-109, 026-115 (brouillons).
- **Rendent compte à** : Claude Code, par le juge de chaque fiche.

#### Le cabinet (13 sous-agents à la demande)
`presti-auditeur`, `presti-audit-attaque`, `presti-audit-conformite` ; `presti-animateur`, `presti-anim-marque`, `presti-anim-accessibilite` ; `presti-gestion`, `presti-gestion-donnees`, `presti-gestion-fiabilite` ; `presti-mails`, `presti-mails-cycle`, `presti-mails-delivrabilite` ; `presti-ai-engineer`. Ils lisent, auditent, recommandent. Ils ne tournent que quand Claude Code les appelle, PC allumé. **Ils rendent compte à** Claude Code.

### 3.3 Veille et prospection

#### Vigie Meta (`vigie_meta`, A7)
- **Rôle** : repère dans la bibliothèque publicitaire de Meta les artisans et les marques qui paient des pubs (passe `artisan` et passe `marque`).
- **Fiches** : 026-069 (juges, brouillon), 026-072 (brouillon), 026-077 (routes cron, brouillon), 026-162 (lecture datée des conditions d'`ads_archive`, brouillon), 026-101 (mutations, brouillon).
- **IA** : l'API officielle `ads_archive` (pas une IA). La lecture des textes de pubs (`veille_pubs`) passe par Codex `gpt-6-luna`, car une Page d'entrepreneur porte souvent son nom. Repli : attente. Perplexity : seulement une recherche ponctuelle de source publique, sans donnée personnelle, si son plan et son coût sont connus.
- **Salle** : Radar.
- **Limites** : l'API seulement, jamais l'interface moissonnée ; aucun prospect venu de Meta n'est contacté tant que le verdict `ads_archive` n'est pas « permis » ; `TERMES_MARQUES` approuvés par Benj. Le jeton Meta est renouvelé par Benj tous les 55 jours.
- **Rend compte à** : Matt (état du bus) ; Benj (carte jaune 7 jours avant l'échéance du jeton).

#### Recenseur (`recenseur`, A8) et le Récupérateur
- **Rôle** : trouve les artisans (liste RGE de l'ADEME, SIREN vérifié, 0 à 9 salariés), lit leur site et y repère un formulaire de contact. Le **Récupérateur** (`recuperateurReseau`, 026-020) est le module qui touche le web à sa place : `robots.txt`, 1 requête par seconde, protection contre le SSRF. Ce n'est pas un agent, c'est sa main.
- **Fiches** : 026-016 (contrat et juges, faite), 026-019 (SIRENE et RGE, faite), 026-020 (lecteur de site, faite, **à reprendre** pour Firecrawl), 026-022 (orchestration, faite, **à reprendre**), 026-060 (graine, brouillon), 026-077 (routes cron, brouillon), 026-165 (mesure à sec sur 200 sites, brouillon), 026-223 (adaptateur Firecrawl, brouillon).
- **IA** : aucune. Firecrawl en option (026-223), avec le lecteur maison en repli. La qualification par Laya `score` (local) est prévue par 026-041, sans agent porteur désigné.
- **Salle** : Radar.
- **Limites** : aucune adresse e-mail relevée (R4 = non) ; jamais contourner une protection ; pages publiques seulement.
- **Rend compte à** : Matt ; ses candidats vont au Juge des faits.

#### Juge des faits (`juge_faits`, J1)
- **Rôle** : juste avant chaque envoi automatique, il relit lui-même le fait cité et le formulaire : toujours éligible, même action, même technologie.
- **Fiches** : 026-016 (juges, faite), 026-065 (faite).
- **IA** : aucune (code).
- **Salle** : Rédaction.
- **Limites** : il ne corrige rien ; il bloque.
- **Rend compte à** : le Facteur (son verdict est l'un des trois).

#### Veille des douleurs (`douleurs`, sans personnage)
- **Rôle** : tient la bibliothèque des problèmes réels des artisans, tirée de sources publiques, où la Plume puise.
- **Fiches** : 026-071 (juges, brouillon), 026-073 (brouillon), 026-226 (passe mensuelle, confiée à Matt, brouillon).
- **IA** : freellmapi (Gemma 4 ou Mistral, données sans coordonnées, D0) ; repli Ollama local (`qwen3`).
- **Salle** : aucune.
- **Limites** : sources publiques ; Benj approuve une fois, puis chaque mois les nouvelles entrées.
- **Rend compte à** : Matt ; Benj pour l'approbation.

### 3.4 Messages sortants

#### Plume (`redacteur`, A1)
- **Rôle** : prépare pour le Facteur le premier contact par le formulaire du site : un modèle approuvé, un fait sourcé, une douleur, une référence. Un par entreprise.
- **Fiches** : 026-069 (juges), 026-083 (modèles, J3, brouillon), 026-087 (brouillon), 026-094 (routes, brouillon).
- **IA** : **aucune**. Elle remplit des modèles approuvés ; elle ne rédige pas librement.
- **Salle** : Rédaction.
- **Limites** : jamais inventer un fait ; rien avant l'ouverture de l'envoi à froid ; aucun prospect venu de Meta sans le verdict « permis ».
- **Rend compte à** : le Facteur.

#### Garde (`garde`, J3) et le second juge
- **Rôle** : juge chaque message avant son départ : modèle approuvé, liste fermée des affirmations, pied, mention IA, référence. Le second juge relit par un modèle.
- **Fiches** : 026-069 (juges, brouillon), 026-083 (brouillon) ; le second juge est porté par 026-089 et 026-094.
- **IA** : Garde = code. Second juge = Codex `gpt-6-luna` sur l'usine ; rejugement du soir (20 h 05) en `gpt-6-sol` ; Laya en troisième avis. Repli : attente, **rien ne part** sans les verdicts.
- **Salle** : Rédaction.
- **Limites** : il ne réécrit jamais un message.
- **Rend compte à** : le Facteur.
- **Note** : le personnage existe dans la station, pas dans la base (section 7).

#### Facteur (`facteur`)
- **Rôle** : le **seul** agent qui approuve et fait partir un message (formulaire du site par le porteur, Gmail de prospection dans le fil, Meta). Il revérifie la notice chaque soir.
- **Fiches** : 026-034 (garde des envois en base, **en cours**), 026-061, 026-062 (juges), 026-063 (disjoncteurs), 026-064 (jauges), 026-089, 026-094, 026-099 (mutations), 026-136 (planification), 026-148 (mise en service de sa moitié sur l'usine) : brouillons.
- **IA** : J1, J3 et l'approbation en code sur Vercel ; le second juge en Codex sur l'usine (voir Garde). Repli : attente.
- **Salle** : Salle des envois.
- **Limites** : trois verdicts obligatoires ; un formulaire par entreprise, à vie ; paliers de 5 à 40 par jour ; envoi à froid fermé jusqu'au 12/10 (seul Benj l'ouvre) ; notice vérifiée depuis moins de 7 jours ; s'arrête à la pause.
- **Rend compte à** : Matt (compteurs) ; Benj (disjoncteurs, canal arrêté, Gmail bloqué, en cartes Attention).

#### Porteur du formulaire (`facteur_usine`)
- **Rôle** : sur l'usine, il ouvre Chromium et soumet les formulaires que le Facteur a approuvés, aux heures ouvrées (lundi à vendredi, 8 h à 18 h).
- **Fiches** : 026-062 (juges), 026-095, 026-143 (mise en service) : brouillons.
- **IA** : aucune (Chromium).
- **Salle** : **aucune** (pas dans `EQUIPAGE`).
- **Limites** : abandonne toute protection (CAPTCHA) sans jamais la contourner ; rien si la dernière relève du Gmail a plus de 15 minutes ; capture du seul formulaire, masquée ; relit la pause avant chaque soumission.
- **Rend compte à** : le Facteur.

### 3.5 Relation prospects

#### Standard (`standardiste`, A3)
- **Rôle** : relève la boîte Gmail de prospection toutes les 5 minutes et les messages Meta, puis classe chaque réponse (oui, question, prix, appel, pas maintenant, stop, ignorer).
- **Fiches** : 026-080 (juges), 026-085, 026-094 (routes), 026-101 (mutations), 026-148 (mise en service sur l'usine) : brouillons.
- **IA** : le code d'abord (STOP, demande RGPD, accusé automatique). Puis Codex `gpt-6-luna` sur l'usine ; Laya `score` en tri local. Repli : une réponse non classée en 30 minutes devient une carte « à lire » pour Benj.
- **Salle** : Standard.
- **Limites** : ne lit que les réponses adressées à l'adresse de prospection, jamais la boîte de Benj ; un STOP est appliqué même pendant la pause ; il ne répond pas.
- **Rend compte à** : le Répondeur (classement) ; Benj (RGPD, cas sensibles, « à lire »).

#### Répondeur (`repondeur`)
- **Rôle** : répond dans le fil, annoncé comme IA : maquette, lien privé, lien de paiement ou de rendez-vous, une seule relance.
- **Fiches** : 026-081 (juges), 026-084 (page de rendez-vous), 026-096, 026-145 (demande entrante), 026-225 (recette de la voie entrante) : brouillons.
- **IA** : **aucune** : des modèles approuvés, choisis selon la classe du Standard.
- **Salle** : Standard.
- **Limites** : jamais de prix hors de la liste, jamais de négociation, jamais de cas sensible ; il passe la main pour un appel ou un paiement.
- **Rend compte à** : Benj (carte « À appeler ») ; Matt (compteurs).

### 3.6 Fabrication

#### Atelier des maquettes (`atelier_maquettes`, A2)
- **Rôle** : sur l'usine, fabrique la maquette d'un site et sa vidéo de 15 à 20 secondes, après un « oui » ou pour un entrant.
- **Fiches** : 026-071, 026-080 (juges), 026-075 (vidéo), 026-082 (lien privé), 026-097, 026-143 (mise en service), 026-163 (épreuve de bout en bout) : brouillons.
- **IA** : le générateur maison (sans IA), Chromium, ffmpeg ; les textes par le Rédacteur des sites (Codex). Repli : `--sans-ia`, le texte du gabarit métier.
- **Salle** : Atelier des maquettes.
- **Limites** : 5 entrants par jour ; variante A seulement si Benj lève le drapeau ; jamais les photos du prospect avant son « oui » ; jamais un visage généré.
- **Rend compte à** : le Répondeur (le lien part par lui) ; Matt.

#### Rédacteur des sites (`redacteur_site`, A4 v2)
- **Rôle** : écrit le contenu d'un site (maquette ou site vendu) à partir des seuls faits connus.
- **Fiches** : 026-029 (juges, faite, **rouverte** le 27/09), 026-093 (brouillon).
- **IA** : Codex `gpt-6-sol` (données personnelles permises). Repli : `--sans-ia` ; dans GitHub Actions, toujours `--sans-ia`.
- **Salle** : Usine à sites.
- **Limites** : rien d'inventé (anti-fabrication).
- **Rend compte à** : le Livreur et l'Atelier.

#### Livreur de sites (`livreur` sur Vercel, `livreur_usine` sur l'usine, A4)
- **Rôle** : mène chaque commande payée jusqu'au site en ligne : génération, contrôle, dépôt, Search Console, trois e-mails, retrait à 12 mois.
- **Fiches faites** : 026-018 (juges lot A), 026-021, 026-023 (**à reprendre**), 026-024, 026-025, 026-026 (**rouverte**), 026-027, 026-028. **Brouillons** : 026-030, 026-031, 026-033, 026-046, 026-052, 026-056, 026-057, 026-078, 026-100, 026-106, 026-141, 026-143, 026-201.
- **IA** : du code, plus le Rédacteur des sites. Repli : GitHub Actions (026-106), jamais un second livreur.
- **Salle** : Usine à sites.
- **Limites** : Benj valide chaque site d'un appui tant que les CGU 3 bis le promettent ; « Mettre en ligne » est son geste ; aucune clé de service ni Stripe sur l'usine.
- **Rend compte à** : Benj (carte à valider) ; Matt.

#### Atelier pubs locales (A6, sans identité propre)
- **Rôle** : fabrique les packs de pubs vendus aux artisans, à partir de leurs seules photos.
- **Fiches** : 026-108, 026-110, 026-124, 026-126, 026-199 (juges) ; 026-112, 026-114, 026-118, 026-131, 026-135, 026-137, 026-144, 026-147, 026-149, 026-153, 026-154, 026-156, 026-157, 026-200, 026-202 ; mutations 026-159, 026-203. Toutes en brouillon.
- **IA** : HyperFrames et la voix locale Kokoro `ff_siwis` ; pas de modèle de langage. Fish Audio : essais internes seulement (026-224), faute de droit commercial.
- **Salle** : Studio pubs (sans personnage).
- **Limites** : aucune personne générée ; juge vert avant tout dépôt ; Benj regarde les 5 premiers packs et clique « Livrer ».
- **Rend compte à** : Benj ; tourne sous le jeton du livreur.

#### Studio pubs (A9, sans identité propre)
- **Rôle** : pour une marque repérée par la Vigie, fabrique un échantillon de vidéo, puis vend le pack de 5 vidéos à 490 €.
- **Fiches** : 026-128 (juges), 026-155, 026-158, 026-166, 026-167 (mutations), 026-200, 026-202, 026-224 : brouillons.
- **IA** : Codex `gpt-6-sol` pour le script (entrée `studio`) ; la vraie photo du produit ; HyperFrames ; Kokoro `ff_siwis` ; fonds FLUX.1 [schnell] facultatifs (Cloudflare, sans donnée personnelle). Aucun modèle vidéo, aucun avatar. Repli : les scripts du poste (026-157, 026-166).
- **Salle** : Studio pubs.
- **Limites** : seulement après l'accord écrit de la marque ; Benj regarde le premier échantillon ; activité de l'entreprise à confirmer par Benj.
- **Rend compte à** : Benj.

### 3.7 Communication

#### Crieur (`crieur`, A14)
- **Rôle** : prépare les publications des réseaux de Presti à partir de faits réels, avec « Commente SITE » en fin de publication, et les dépose en brouillon dans Publora ; Benj programme lui-même chacune qu'il accorde (tranché le 27/09 : R24 remplace R7).
- **Fiches** : 026-116 (juges), 026-119, 026-122, 026-134, 026-207 : brouillons (alignés sur R24 le 27/09, avec 026-044 et 026-063).
- **IA** : **aucune** ; Laya `noul` vérifie chaque chiffre avant publication (règle du domaine réseaux).
- **Salle** : Tour du Crieur.
- **Limites** : 3 programmations à la fois et 15 par mois (Publora Starter) ; muet pendant la pause ; créneau proposé à 26 h au plus ; ~~publie seul seulement si R7 est confirmée~~ : **ne publie jamais seul** ; aucun agent n'envoie `scheduledTime` à Publora ; l'accord de Benj, pour chaque publication, est son geste de programmer le brouillon (R24, tranché le 27/09).
- **Rend compte à** : Benj ; Matt.

#### Service contenu (C01 à C16, sans agent nommé)
- **Rôle** : une chaîne complète pour TikTok, Instagram et Facebook : mémoire marketing, cinq lignes éditoriales, fabrique de vidéos sur l'usine, publication, mesure, boucle d'apprentissage, veille des tendances, coûts par agent.
- **Fiches** : 026-204 (juges) à 026-219 (mutations), toutes en brouillon.
- **IA** : HyperFrames, Playwright (captures de Presti), Laya `noul` (seuil 0,5) et `score` ; veille des tendances par freellmapi (D0). Aucune donnée d'artisan vers une IA gratuite ou `:cloud`.
- **Salle** : aucune (panneaux dans 026-216).
- **Limites** : accord de Benj pour **chaque** publication (R24) ; aucune pub payante ; pas de Windsor ; pas de lecture robotisée de TikTok Studio ; pas de vidéos d'autrui.
- **Rend compte à** : Benj.

### 3.8 Argent

#### Trésorier (`tresorier`, A5)
- **Rôle** : un seul calcul par chiffre : recettes, abonnements, coûts, marge, cumul face au seuil de franchise de TVA. Il nourrit la tuile Argent et la Trésorerie.
- **Fiches** : 026-018 (juges, faite), 026-055 (faite), 026-059 (route et tuile, brouillon).
- **IA** : aucune.
- **Salle** : Trésorerie.
- **Limites** : lecture seulement ; ne paie rien, ne déclare rien.
- **Rend compte à** : Matt (chiffres de la réunion) ; Benj.
- **Note** : personnage de la station, sans identité en base (section 7).

### 3.9 Surveillance

#### Veilleur (`a0`, A0)
- **Rôle** : toutes les 5 minutes, fait la ronde : agents muets, baux expirés, disjoncteurs, Gmail bloqué, notice périmée, usine injoignable, jeton Meta à J-7, Vercel Pro au premier site payé. Envoie les digests de 7 h 30 et 18 h 30.
- **Fiches** : 026-045 (juges, faite), 026-047, 026-049 (le tic), 026-051 (Web Push), 026-086 (pg_cron), 026-091 (mutations), 026-138 (épreuve de 24 h) : brouillons.
- **IA** : aucune.
- **Salle** : Salle des machines.
- **Limites** : il surveille et prévient ; il n'agit pas.
- **Rend compte à** : Benj (cartes Attention, notifications, digests) ; Matt.

#### Surveillance de l'usine (`usine`)
- **Rôle** : une mesure par minute de l'usine (charge, mémoire, Codex connecté) et des quotas des IA gratuites (freellmapi, Codex, Ollama).
- **Fiches** : 026-048 (juges, faite), 026-050 (coffre, faite), 026-053 (**refusée** le 27/09 : FAIL SV-12), 026-054 (graine), 026-058 (mise en service), 026-133 (mutations), 026-197 (durcissement) : brouillons.
- **IA** : aucune.
- **Salle** : **aucune** (voir la confusion avec la salle « Usine à sites », section 7).
- **Limites** : lit sans jamais relire une valeur du coffre.
- **Rend compte à** : le Veilleur (carte « usine injoignable ») et la Salle des machines.

#### Système (`systeme`)
- **Rôle** : l'identité technique des événements du Poste ; Matt lit les consignes de Benj sous ce nom (026-042). Son rôle exact n'est décrit nulle part en une phrase.
- **Fiches** : 026-010 et 026-011 (graine et identité, faites), 026-044 (pause générale, brouillon).
- **IA** : aucune. **Salle** : Salle des machines. **Rend compte à** : personne (c'est un canal).

#### Pont Telegram (`pont_telegram`)
- **Rôle** : relie le téléphone de Benj à l'usine : `/etat`, `/pause <motif>`, `/chef <texte>`, et les comptes rendus de Matt.
- **Fiches** : 026-088 (graine), 026-194 (juges), 026-195, 026-196 (mise en service), 026-198 (mutations) : brouillons.
- **IA** : aucune (long polling, aucun port ouvert).
- **Salle** : **aucune**.
- **Limites** : pose la pause, ne la lève jamais ; appairé par un code à usage unique ; n'envoie rien à un prospect.
- **Rend compte à** : Benj.

### 3.10 Expérience (`experience`)
- **Rôle** : une expérience bornée (à 0 €), lancée par Matt après la première vente encaissée.
- **Fiches** : 026-088, 026-125 (salle), 026-227 : brouillons.
- **IA** : non définie. **Salle** : Salle Expérience (fermée avant la première vente, R13).
- **Limites** : aucune dépense ; rien avant un encaissement confirmé.
- **Rend compte à** : Matt ; Benj.

### 3.11 Hors équipage

#### Cerveaux du produit (`lib/ai.ts`)
- **Rôle** : répondent aux clients des artisans, relancent, chiffrent les devis. Ce sont les agents qui travaillent **pour les clients payants**, 24 h/24.
- **Fiches** : aucune dans la série 026.
- **IA** : API Anthropic « produit » (Haiku 4.5, Sonnet 5 ou Opus 5 selon le palier de l'artisan). **Aucun repli** en cas de saturation (la fiche IA07 du registre n'a jamais été écrite).
- **Salle** : Presti (scores des Cerveaux seulement).
- **Rend compte à** : Claude Code (seul à les modifier, agent `presti-ai-engineer`).

#### Support (A13)
- **Rôle prévu** : brouillons de réponses aux courriers de l'entreprise, puis envoi automatique pour la FAQ.
- **État** : suspendu par la décision D18 (« ce sont des humains qui répondent », 09/09). Aucune fiche. La salle Presti n'en montre que le **nombre** de tickets (026-174, 026-189).

#### OpenClaw
- **Rôle** : non défini. 026-221 l'installe dans un conteneur confiné sur l'usine, branché à Ollama local, Ollama Cloud et freellmapi. **Tranché le 27/09** : oui, confiné (décision de Benj du 26/09) ; tant que son rôle n'est pas écrit dans une fiche, il n'a ni identité dans `ops.agents`, ni jeton du bus, ni salle, ni capacité `pause` ou `consigne`.
- **Fiches** : 026-220 (juges, faite), 026-221, 026-228 (mutations) : brouillons ; 026-139, 026-194, 026-195, 026-088 et 026-044 alignées sur 026-221 le 27/09.
- **Limites** : jamais l'abonnement Claude (ni jeton, ni session, ni OAuth Claude) ; modèles gratuits seulement, Groq exclu ; pas une seconde porte d'envoi ; aucune donnée de prospect vers `:cloud` ni freellmapi ; aucune installation hors du conteneur.

---

## 4. La station Claw3D : qui est dans quelle salle

Source : `SALLES` et `EQUIPAGE` de 026-070, tableau §3.2 de l'interface. 20 salles, plus la réservée.

| Salle | Genre | Titulaires | Remarque |
|---|---|---|---|
| Commandement | décision | Matt | |
| Salle de réunion | décision | — | Matt y vient à 18 h |
| Radar | veille | Vigie Meta, Recenseur | |
| Rédaction | travail | Juge des faits, Plume, Garde | Garde sans identité en base |
| Salle des envois | travail | Facteur | le porteur n'y est pas |
| Standard | travail | Standard, Répondeur | |
| Atelier des maquettes | travail | Atelier | |
| Usine à sites | travail | Rédacteur des sites, Livreur | `livreur_usine` n'y est pas |
| Recettes | argent | — | **sans titulaire** |
| Trésorerie | argent | Trésorier | Trésorier sans identité en base |
| Tour du Crieur | travail | Crieur | |
| Studio pubs | travail | — | **sans titulaire**, alors que 28 fiches y travaillent |
| Salle Expérience | travail | Expérience | fermée avant la première vente |
| Salle des machines | veille | Veilleur, Système | + tout agent inconnu, avatar par défaut |
| Chantier du code | travail | Pont de l'orchestre | |
| Audience | veille | — | **sans titulaire** |
| Sécurité | veille | — | **sans titulaire** |
| Presti | argent | — | **sans titulaire** |
| Observatoire | veille | — | **sans titulaire** |
| Salle de repos | repos | — | destination de la pause |
| E-commerce | réservée | — | porte fermée, rien de construit (026-176) |

---

## 5. Tableau récapitulatif

États : F = faite, C = en cours, R = refusée, B = brouillon. « Rep. » = faite mais à reprendre ou rouverte.

| Poste | Nom technique | Fiches (état) | IA principale → repli | Salle | Ne fait jamais | Rend compte à |
|---|---|---|---|---|---|---|
| Matt | `chef` | 2 F, 7 B | Codex sol / luna → cycle sauté ; reprise PC | Commandement | envoyer, dépenser, approuver, publier | Benj, Claude Code |
| Revue du lundi | — | 1 F, 1 C | Claude Code + script | — | fusionner, inventer un chiffre | Benj |
| Chantier | — | 1 F, 1 C | Claude Code | Chantier | fusionner | Benj |
| Pont de l'orchestre | `pont` | 2 B | aucune | Chantier | lancer une fiche | Claude Code |
| Vigie Meta | `vigie_meta` | 5 B | API Meta ; Codex luna → attente | Radar | moissonner l'interface | Matt, Benj |
| Recenseur | `recenseur` | 4 F (2 rep.), 4 B | aucune ; Firecrawl → lecteur maison | Radar | relever une adresse, contourner | Matt |
| Juge des faits | `juge_faits` | 2 F | aucune | Rédaction | corriger | Facteur |
| Veille des douleurs | `douleurs` | 3 B | freellmapi → Ollama local | — | source non publique | Matt, Benj |
| Plume | `redacteur` | 4 B | aucune | Rédaction | écrire hors modèle | Facteur |
| Garde et second juge | `garde` | 2 B | code ; Codex luna, rejuge sol → attente | Rédaction | réécrire un message | Facteur |
| Facteur | `facteur` | 1 C, 9 B | code + second juge → attente | Envois | envoyer sans 3 verdicts | Matt, Benj |
| Porteur du formulaire | `facteur_usine` | 3 B | aucune (Chromium) | — | contourner un CAPTCHA | Facteur |
| Standard | `standardiste` | 5 B | code ; Codex luna ; Laya → « à lire » | Standard | répondre, lire le Gmail de Benj | Répondeur, Benj |
| Répondeur | `repondeur` | 5 B | aucune (modèles) | Standard | négocier, prix hors liste | Benj, Matt |
| Atelier des maquettes | `atelier_maquettes` | 7 B | générateur + Codex sol → `--sans-ia` | Atelier | photo avant « oui », visage généré | Répondeur, Matt |
| Rédacteur des sites | `redacteur_site` | 1 F (rep.), 1 B | Codex sol → `--sans-ia` | Usine à sites | inventer | Livreur, Atelier |
| Livreur | `livreur`, `livreur_usine` | 8 F (2 rep.), 13 B | code → GitHub Actions | Usine à sites | mettre en ligne sans Benj | Benj, Matt |
| Atelier pubs locales | (jeton du livreur) | 22 B | HyperFrames + Kokoro | Studio (vide) | personne générée | Benj |
| Studio pubs | (jeton du livreur) | 8 B | Codex sol + Kokoro + FLUX → poste | Studio (vide) | modèle vidéo, avatar | Benj |
| Crieur | `crieur` | 5 B | aucune ; Laya `noul` | Tour du Crieur | publier un fait non prouvé | Benj, Matt |
| Service contenu | — | 16 B | HyperFrames, Laya, freellmapi (D0) | — | publier sans accord | Benj |
| Trésorier | `tresorier` | 2 F, 1 B | aucune | Trésorerie | payer, déclarer | Matt, Benj |
| Veilleur | `a0` | 1 F, 6 B | aucune | Machines | agir | Benj, Matt |
| Surveillance de l'usine | `usine` | 2 F, 1 R, 4 B | aucune | — | lire le coffre | Veilleur |
| Système | `systeme` | 2 F, 1 B | aucune | Machines | — | — |
| Pont Telegram | `pont_telegram` | 5 B | aucune | — | lever une pause | Benj |
| Expérience | `experience` | 3 B | non définie | Expérience | dépenser | Matt, Benj |
| Cerveaux du produit | (`lib/ai.ts`) | 0 | API Anthropic produit → aucun repli | Presti | — | Claude Code |
| Support | — | 0 | — | Presti (compte) | répondre seul (D18) | — |
| OpenClaw | — | 1 F, 3 B | Ollama local / Cloud, freellmapi | — | toucher l'abonnement Claude | Claude Code |

---

## 6. Postes manquants

Ce qu'une vraie entreprise a et que l'écosystème n'a pas. Pour chacun : ce qu'il ferait, l'IA qui conviendrait, ses limites, sa salle. À Claude Code de choisir lesquels passent en fiches. Ordre proposé : du plus urgent au moins urgent.

| # | Poste | Ce qu'il ferait | IA qui conviendrait | Limites | Salle |
|---|---|---|---|---|---|
| 1 | **Comptable** | Tient le livre des recettes de Presti, rapproche chaque encaissement Stripe d'une vente, suit le chiffre face au seuil de la franchise (art. 293 B), prépare les montants des déclarations URSSAF, repère les paiements d'abonnement échoués. Peut être un volet du Trésorier, à condition de lui donner enfin une identité en base. | Code (Stripe en lecture seule) ; Laya `noul` sur chaque chiffre rendu ; Codex `luna` pour un libellé (données de clients = D1). | Ne paie rien, ne déclare rien (Benj soumet), ne change aucune mention de TVA (les trois changements vont ensemble, le jour de l'immatriculation), aucune clé Stripe en écriture. | Recettes |
| 2 | **Service client après la vente** | Répond aux artisans qui ont acheté (site, pack, abonnement) : questions sur le site, le Poste, la facture, une modification. Brouillons d'abord, envoi automatique de la seule FAQ après 20 brouillons approuvés sans retouche (règle D18). | Codex `luna` sur l'usine (D1) ; repli Ollama local après le « oui » de Benj ; sinon carte « à lire ». | Aucun remboursement, aucun geste commercial, aucune modification de compte, aucune promesse hors FAQ ; les envois passent par un portier (le Facteur ou son équivalent client). | Presti |
| 3 | **Contrôleur qualité des sites livrés** | Après la mise en ligne, puis chaque mois : le site répond, HTTPS, poids, accessibilité, liens morts, mentions légales de l'artisan, indexation dans la Search Console, formulaire présent et fonctionnel. | Code sur l'usine (Playwright, Lighthouse) ; le verdict visuel d'une capture par Codex (le site porte le nom de l'artisan) ; Laya en tri. | Ne modifie jamais un site en ligne ; n'envoie jamais de faux message dans le formulaire d'un client ; propose une correction au Livreur ou à Claude Code. | Usine à sites |
| 4 | **Vigile (sécurité)** | Titulaire de la salle Sécurité : bans, erreurs des 24 h, dépendances vulnérables (Next 15 n'a plus de correctifs après le 21/10), avis Supabase, secrets exposés, jetons à renouveler, état des déploiements Vercel après chaque push. | Code ; Codex `luna` pour résumer (D0). | Ne corrige rien en production, ne fait tourner aucune clé. **Pose une pause de sécurité sur un agent (seuil de `vigile.json`), ne la lève jamais, ne pose jamais la pause générale** (tranché par Benj le 28/09 : « uniquement si c'est nécessaire ») : seulement sur un seuil de gravité (sécurité, argent, loi : secret exposé, boucle d'erreurs qui coûte, envoi hors règle, dépense anormale), jamais sur un défaut de qualité, qu'il signale seulement ; jamais sur Matt, Claude Code ni le pont ; chaque pause remonte à Matt et à Benj. Même levier que Matt, par la même route. | Sécurité |
| 5 | **Juriste (conformité continue)** | Veille des textes (démarchage entre professionnels, RGPD, rétractation L221-28, LCEN) ; tient à jour le registre des traitements ; compte à rebours de chaque demande RGPD (un mois) ; signale une CGU ou une notice à revoir. | Codex `sol` pour le texte ; sources publiques (Légifrance, CNIL) par Firecrawl ou le lecteur maison (D0) ; Laya `noul`. | Ne publie aucune CGU, ne répond à aucune demande légale seul, ne se présente jamais comme avocat ; `presti-audit-conformite` relit ses propositions. | Sécurité ou Commandement |
| 6 | **Succès client (rétention)** | Accompagne l'artisan après l'achat : dossier complété, première connexion au Poste, premier devis ; repère un abonnement qui ne sert pas et propose une relance approuvée. | Code (métriques d'usage) ; Codex `luna` (D1) pour choisir le modèle de relance. | Aucun rabais, modèles approuvés seulement, un « stop » arrête tout, envoi par le portier. | Presti |
| 7 | **Veille concurrentielle** | Suit les offres, prix et fonctions des concurrents (logiciels de devis pour artisans, créateurs de sites) et leurs pubs dans la bibliothèque Meta ; nourrit la réunion de Matt et le chantier. | Firecrawl ou lecteur maison (pages publiques) ; freellmapi ou Ollama Cloud (D0 : ce sont des entreprises, pas des personnes) ; Perplexity ponctuel si son plan est connu. | Sources publiques, `robots.txt` ; aucun compte créé chez un concurrent, aucun contact. | Observatoire ou Radar |
| 8 | **Recruteur de partenaires** | Trouve et qualifie des apporteurs d'affaires (négoces de matériaux, comptables d'artisans, chambres de métiers, agences locales) et fait vivre le programme d'apport **qui existe déjà** (`lib/apports.ts`, lien `/a/<code>`) : apports prouvés, commissions dues (calculées, jamais payées). | Code (même chaîne que le Recenseur) ; Codex `luna` quand un nom de personne entre (D1). | Aucun contrat, aucune promesse de commission hors barème approuvé, premier contact par le seul Facteur. | Observatoire |
| 9 | **Analyste d'audience** | Titulaire de la salle Audience : visites par page et par minute, campagnes, attribution prudente des ventes aux publications (rejoint C10 et C11). | Code ; freellmapi (agrégats, D0). | Jamais identifier un visiteur ; agrégats seulement ; pas de Windsor. | Audience |
| 10 | **Contrôleur des agents** | Mesure la qualité de chaque agent : taux de refus des juges, cartes « à lire », pannes, coûts ; tient les journaux d'apprentissage ; propose des retouches de modèles à Claude Code. C'est le « DRH » de l'équipage. | Code ; Laya `score` ; Codex `sol` pour la synthèse (D0). | Ne modifie aucun modèle ni aucun prompt, ne met aucun agent en pause. | Salle de réunion |
| 11 | **Intendant** | Les échéances : fin de l'essai Oracle (24/10), jeton Meta (55 jours), domaines, Vercel Pro au premier site, quotas Codex et Claude de la semaine, Publora plein. Prévient 7 jours avant. Peut être un volet du Veilleur. | Code. | N'achète rien, ne crée aucun compte. | Salle des machines |
| 12 | **Collecteur d'avis et de témoignages** | Demande un avis et un témoignage aux clients satisfaits, avec leur accord écrit ; les range comme « faits prouvés » pour le Crieur et le service contenu. | Modèles approuvés (sans IA) ; Codex `luna` pour trier les réponses (D1). | Aucune récompense contre un avis ; rien de publié sans l'accord du client et de Benj. | Tour du Crieur |

**Déjà réservé, à ne pas construire** : la branche e-commerce et dropshipping (salle réservée, 026-176). Elle attend les trois vidéos sources de Benj.

**Et la mission du 27/09** (INDEX l.812) : « revoir et réaméliorer Presti dans son entier ». Elle demande une fiche de juges puis une fiche de revue. Le Contrôleur qualité (3), le Juriste (5) et le Contrôleur des agents (10) en seraient les bras naturels.

---

## 7. Incohérences trouvées

> Ce qui a été tranché le 27/09 au soir est récapitulé en fin de document, « Décisions appliquées le 27/09 » ; les points ci-dessous sont gardés tels que relevés.

### 7.1 Agent cité sans fiche ou sans identité
1. **Garde et Trésorier** sont des personnages de la station (`EQUIPAGE`, 026-070) mais ne sont semés dans aucune migration (0096, 0105, 0110, 0112). Or la station ne montre que les agents « présents dans les lignes reçues » : ces deux personnages **n'apparaîtront jamais**.
2. **Support (A13)** : cité par le plan, compté dans la salle Presti (026-174, 026-189), sans aucune fiche ; suspendu à D18.
3. **`veille_pubs`, `douleurs` et `studio`** ont une entrée dans `MOTEUR_DE` (026-041) mais ne sont pas des agents du bus. Le coût de chaque appel s'inscrit par `ops_cout_ajouter(p_agent, …)`, et 026-060 dit qu'un agent non semé fait échouer cet appel. [à vérifier : sous quel nom ces trois lecteurs inscrivent leur coût]
4. **Atelier pubs locales et Studio pubs** n'ont pas d'identité : ils tournent sous le jeton `livreur_usine` (026-200). Leurs battements, coûts et pauses se confondent avec ceux du Livreur.
5. **Service contenu (C01-C16)** : 16 fiches, aucun agent semé, aucune salle (le document marketing le dit lui-même : « aucun agent semé dans `ops.agents` »).
6. **Qualification des prospects** : Laya `score` est prévu (026-041), aucun agent n'en est porteur.

### 7.2 Fiche ou identité sans place
7. **`facteur_usine`, `usine`, `livreur_usine`, `pont_telegram`** sont semés en base mais absents d'`EQUIPAGE` : ils tombent en Salle des machines avec l'avatar par défaut. La correction du 27/09 de 026-070 demande une salle « au Facteur et au pont Telegram » ; le Facteur en a déjà une, il s'agit sans doute du porteur (`facteur_usine`). [à vérifier]
8. **OpenClaw** (026-221) : installé et confiné, mais sans rôle, sans agent, sans salle et sans juge de ce qu'il produit.
9. **Cursor** (026-222) : exécutant prévu, inactif tant que son coût nul n'est pas prouvé.
10. **Cerveaux du produit** : aucun repli de modèle ; la fiche IA07 du registre n'a jamais été rangée dans la série.

### 7.3 IA non disponible ou règle contradictoire
11. **Le registre §2.2 envoie encore toute la voie D1** (Plume, Répondeur, qualification, maquettes, juges des envois) vers la clé Anthropic « agents » (R16). Cette clé est **annulée** depuis la revue transverse du 25/09. Les fiches ont été réécrites (Codex), pas le registre.
12. **La salle Trésorerie** (interface §3.2) affiche le « crédit restant de la clé agents » et la pastille `creditBas` : une clé qui n'existera pas.
13. **Groq** reste une bascule du registre (`compound`, Whisper) alors que Benj l'a refusé (INDEX, 25/09).
14. **Secours du chef** : le registre §4.3 dit « jamais du gratuit » pour Matt, le §6 fait d'Ollama Cloud `gpt-oss:120b` le premier secours de Codex. Les données du chef sont D0 : le secours serait permis par la règle des données. À trancher.
15. **Ollama local pour les données de prospect** : prévu, mais attend le « oui » de Benj. D'ici là, le seul repli D1 est l'attente.
16. **Codex en automatique sur les données de prospect** : le registre disait « jamais en automatique » ; la revue transverse en a fait le moteur du Standard et du Facteur. L'en-tête de l'INDEX dit que G3 (fait le 25/09) lève la condition, mais la question 1 de l'INDEX (l.607) reste écrite « ouverte ».
17. **Firecrawl** est un service hébergé qui lit des sites d'artisans, souvent au nom d'un entrepreneur individuel. La règle « une donnée de prospect ne va qu'à Codex ou au local » ne dit pas si une adresse de site publique envoyée à Firecrawl en est une. À trancher avant 026-223.
18. **Indisponibles aujourd'hui** : Perplexity (plan et coût inconnus), Fish Audio et ElevenLabs gratuits (pas de droit commercial), Nano Banana (payant), Windsor (jamais souscrit), Gemini CLI et Qwen (non configurés), Antigravity (dormant, interdit de juges), Cerebras (0 modèle), « One 3G » (nom inconnu). Aucun agent ne doit les avoir en voie principale.

### 7.4 Salles
19. **Six salles sans titulaire** : Recettes, Studio pubs, Audience, Sécurité, Presti, Observatoire. (Réunion et Repos sont des lieux de passage ; E-commerce est réservée.)
20. **Homonymie** : l'agent `usine` surveille le serveur, la salle `usine` est « l'Usine à sites » du Livreur. Le personnage `usine` n'est pas dans la salle qui porte son nom.
21. **Studio pubs** : la salle est vide alors que 28 fiches (pubs locales et Studio) y travaillent.

### 7.5 Structure et règles
22. **Matt ne commande personne** : toutes ses tâches vont au pont, donc à Claude Code. Il ne peut ni mettre un agent en pause, ni le relancer, ni régler un plafond. Si Benj veut un vrai directeur des opérations, il lui faut au moins un type de tâche « réglage » qu'un agent sait exécuter, sous plafond.
23. **La consigne adressée à un agent** (« BENJ ▸ FACTEUR », 026-074, 026-117, 026-123) n'est lue par aucun agent destinataire : seul Matt lit les consignes (`consignes.mjs`). La consigne à un agent n'a donc pas d'effet direct. [à vérifier dans 026-089 et 026-085 une fois produites]
24. **Revue du lundi et chantier** tournent sur le PC (docs/agents) : pas PC éteint, contraire au 24 h/24. Le plan les voulait en routine cloud.
25. **Le pont de l'orchestre** ne tourne pas PC éteint : la nuit, les tâches de Matt s'empilent.
26. **Crieur** : R7 (« publie seul ») et R24 (« accord de Benj pour chaque publication », 26/09) coexistent dans les fiches. Les deux ne peuvent pas être vraies en même temps. **Tranché le 27/09 : R24.** Le Crieur prépare et dépose en brouillon ; Benj programme chaque publication qu'il accorde (026-116, 026-119, 026-122, 026-134, 026-044, 026-063, 026-207). INDEX aligné le 27/09 au soir (lignes des fiches 026-116, 026-122, 026-134, vague V63, décisions R, urgences, questions ouvertes).
27. **OpenClaw** : l'INDEX dit encore « OpenClaw : non » (l.21, l.467) et le corps de 026-139 vérifie son absence de l'usine, alors que 026-221 l'y installe. La correction du 27/09 en fin de 026-139 inverse la règle : à réconcilier au moment de produire. **Tranché le 27/09 : oui, confiné** ; 026-139 (ligne de `decisions.md` « OUI, confiné », seule une installation hors conteneur est une alerte), 026-194, 026-195, 026-088 et 026-044 alignées. INDEX aligné le 27/09 au soir (en-tête, « Comment lire », ligne de 026-139, téléphone, revue transverse, B11).
28. **Plan périmé** : A10 (chef en « cloud Claude à 7 h »), A1 et A3 (« API Haiku »), A9 (« séance Claude Code supervisée »). Le plan du 24/09 ne décrit plus l'écosystème réel.
29. **026-039** est dans `fait/`, mais son dernier verdict rejoué est FAIL (27/09, 20 h 05, `verdicts.jsonl`).
30. **Juges rouverts** : 026-026, 026-029 et 026-168 (juges de Gemini) sont rouverts ; 026-001, 026-009, 026-012, 026-020, 026-022 et 026-023 sont à reprendre. Les fiches qu'ils jugent attendent.

---

## 8. Ce que Claude Code a à trancher, en une liste
1. Quels postes manquants passent en fiches (section 6) ; recommandation : Comptable, Service client après la vente, Contrôleur qualité des sites, Vigile.
2. ~~Donner une identité en base (graine) au Trésorier, au Garde, à l'Atelier pubs et au Studio ; une salle au porteur, à la surveillance de l'usine et au pont Telegram~~ (tranché le 27/09 : cinq graines dans 0113, `EQUIPAGE` à 25 noms ; voir « Décisions appliquées »).
3. ~~Donner à Matt un levier réel, borné~~ (tranché le 27/09 : pause de sécurité et consignes adressées, par fiches de suite).
4. ~~Réécrire le registre des IA (§2.2) sans la clé « agents », sans Groq, avec Ollama et Laya~~ (fait le 27/09).
5. ~~Trancher R7 contre R24 pour le Crieur~~ (tranché le 27/09 : R24, voir 7.5 n° 26) ; ~~Firecrawl et les données de prospect ; le secours gratuit du chef~~ (tranchés le 27/09 : URL publique seulement ; Ollama Cloud sur `ops_etat()` seul).
6. ~~Définir le rôle d'OpenClaw, ou ne pas l'installer~~ Installé, confiné (Benj, 26/09 ; 7.5 n° 27). Son rôle reste à écrire dans une fiche ; d'ici là, aucune identité, aucun jeton du bus, aucune salle.

---

## Décisions appliquées le 27/09

Quatre lots, puis un intégrateur, le 27/09 au soir. Chaque brouillon touché porte une section « Décision du chef d'entreprise (27/09) » et passe `node scripts/orchestre.mjs valider` ; aucun n'était dans `file/`, `en-cours/`, `fait/` ni `refuse/`. Le méta-juge de couverture de 026-001 reste vert. Rien n'est commité.

1. **Données de prospect (D1)** : Codex (abonnement ChatGPT, `presti-ia-modele`) ou le local de l'usine après le « oui » daté de Benj ; sinon la tâche attend. Clé « agents » absente, Groq rejeté partout, aucun `:cloud`. Registre des IA réécrit ; 026-041, 026-043.
2. **Secours de Matt** : `sol`, puis `luna`, puis Ollama Cloud sur `ops_etat()` seul, puis cycle sauté ; jamais pour la réunion ni la file IA des agents. 026-129, 026-148.
3. **Firecrawl** : seulement l'URL publique d'un site d'entreprise, en `lire` ; `chercher` n'est la voie d'aucun agent. 026-165, 026-215, 026-228.
4. **Juges** : Claude seulement ; plus aucun secours de juge dans Antigravity ni par Codex.
5. **Crieur** : R24 remplace R7. Brouillon dans Publora, Benj accorde chaque publication en la programmant. 026-116, 026-119, 026-122, 026-134, 026-044, 026-063, 026-207.
6. **OpenClaw** : oui, confiné sur l'usine (026-221), sans jeton du bus, sans Telegram, sans pause ni consigne ; ce n'est pas une porte d'envoi. 026-139, 026-194, 026-195, 026-088.
7. **Identités** : 0113 sème `garde`, `tresorier`, `studio`, `contenu`, `douleurs` ; `EQUIPAGE` passe à 25 noms, chacun dans une salle (quatre salles sans titulaire, par construction). 026-062, 026-070, 026-089, 026-141, 026-175, 026-189, 026-199, 026-200, 026-202, 026-209, 026-226.
8. **Matt et 24 h/24** : pause de sécurité (jamais la reprise) et consignes adressées routées par le script ; pont de l'orchestre sur l'usine (mode `prendre`) ; revue du lundi et chantier sur l'usine, sans routine cloud. 026-074, 026-085, 026-089, 026-103, 026-117, 026-129, 026-142, 026-148, 026-160, 026-161.
9. **INDEX** : lignes des fiches et prose alignées sur 1 à 8 (R7, OpenClaw, pont, identités, Firecrawl, question 1 tranchée).

### Ce qui reste

- **Fiches de suite, juges d'abord (Claude Code)** :
  - « secours de Matt » : étendre `chef-qa` de **026-102** (faite) : CH-C4 exige encore « quota → code 3 sans appeler Codex » ; plus une entrée piégée, CH-F2 avec `gpt-oss:120b-cloud`, CH-U5. Seulement si l'extension n'est pas prête quand 026-129 part (le refus du `:cloud` côté file IA part dans tous les cas).
  - « pause de Matt » : champ `pauses` du plan, posté par `appliquer.mjs` de **026-105** (faite) ; juge `chef-qa` de 026-102 étendu ; mise en service rejouée sur un agent d'essai (026-148).
  - « consignes adressées » : routage dans `fil.mjs`, lecture dans `passes-modele.mjs` ; CH-F2 de 026-102 (« rien d'autre » que `consigne_lue` et `cycle_termine`) à relire.
  - « revue et chantier sur l'usine » : unités du lundi et de la collecte ; CH-U1 de 026-102 compte exactement dix unités.
  - **026-067** (faite) : `station-logique-qa` doit lire EQ-1 à 25 noms et EQ-7 **avant** 026-070.
  - **026-104** (en cours) : son lot `salles-suite` juge la Tour du Crieur de 026-164, décrite comme « ce qu'il a programmé » ; avec R24 le Crieur ne programme plus. 026-164 et le critère SB concerné sont à aligner après le PASS de 026-104. [à vérifier sur les critères SB]
- **Incohérence entre lots** : 026-175 et 026-209 disent que 026-041 et 026-043 renomment `veille_pubs` en `vigie_meta` et ajoutent une entrée `contenu` à `MOTEUR_DE` ; ni 026-041 ni 026-043 ne le disent, et 026-234 (couche Savoir) nomme encore `veille_pubs`. À trancher : renommer partout, ou garder la clé et inscrire le coût sous `vigie_meta`.
- **Firecrawl dans les fiches faites** : 026-223 propose toujours `chercher`, et FC-8 de 026-220 n'attrape pas un nom ; la règle ne tient que par les appelants. À relire aussi : 026-232 et 026-233 (couche Savoir, écrites ce soir) prévoient une recherche web par Firecrawl et un outil `chercher` pour les agents.
- **Encore ouvert** : décision 1 (postes manquants) ; le rôle d'OpenClaw dans une fiche ; Support A13 (D18) ; qui porte la qualification (Laya `score`) ; repli des Cerveaux du produit (IA07) ; plan du 24/09 périmé (n° 28) ; 026-039 désormais dans `refuse/` ; juges rouverts (n° 30).
- **Geste de Benj** : le « oui » daté pour qu'Ollama local et Laya reçoivent des données de prospect. D'ici là, Codex est la seule voie D1.
