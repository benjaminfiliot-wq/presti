# RESUME 10 LIGNES
1. Le vault C:/Users/benja/Documents/SaaS compte 1 088 notes .md (19 Mo). Il n'est pas sous Git, et sa seule sauvegarde est Documents/SaaS-sauvegarde-2026-10-26 (136 notes, d'avant le wiki).
2. 70 % des notes sont dans wiki/ (760) : 80 concepts, 15 entités, 22 sources, 6 cartes, index/hot/overview/log, et 633 notes dans wiki/outils/, dont 624 sont générées puis supprimées et réécrites chaque soir.
3. inbox/sessions/ contient 184 fils (109 du crochet SessionEnd/PreCompact, 75 des tâches et workflows), dont 98 encore en « statut: a-integrer ».
4. Les notes d'avant le 26/10 sont 137 (Produit 54, Coentreprise 29, Prospection 21 plus 12 fichiers de données de prospects, Recherche 8, Legal 7…). 123 d'entre elles n'ont pas d'en-tête YAML.
5. Il n'existe ni dossier memoire/ ni Templates/, ni .canvas, ni .base, et aucun plugin communautaire Obsidian. Aucun dossier de modèles n'est réglé. Les plugins de base Sync et Bases sont actifs.
6. Le CLAUDE.md du vault (19/10) a 6 sections et 10 règles de travail. Il ne cite ni wiki/, ni inbox/, ni hot.md, ni n8n, Hermes ou Orca.
7. Le MCP cerveau tourne en stdio, déclaré globalement dans ~/.claude.json. Ses 4 outils sont en lecture (chercher, lire, regles_pour, quoi_de_neuf) sur 8 sources (1 654 fichiers). Il n'écrit que son journal ; c'est son interface 127.0.0.1:8810 qui dépose des tâches dans l'orchestre.
8. Écrivent dans le vault : capture-session.mjs, le rangement du soir, catalogue-outils.mjs, orchestre contexte (Carte-du-code), coentreprise.mjs, file-agents.mjs, 17 tâches planifiées et des workflows.
9. Le rangement du soir échoue depuis le 29/10 au soir (« weekly limit ») : hot, log, wiki/outils et notes Journee sont figés au 29/10. L'apprentissage hebdo n'a jamais tourné (1er passage prévu ce soir, vers 20 h 06).
10. Aucun des 7 dossiers « 10 Presti/… » à « 50 Automatisations/04 Prompts » n'existe. Les notes correspondantes et les chemins codés en dur à préserver sont listés dans l'inventaire.

# CONTENU
# Inventaire du vault Obsidian `C:/Users/benja/Documents/SaaS` au 01/11/2026 (lecture seule)

**Méthode.** Le vault a été lu avec `find`, `ls`, `grep` et `node`, sans rien modifier. Pour la config, seuls les noms de clés ont été relevés. Le code du cerveau, des tâches et des crochets a été lu, et le cerveau interrogé d'abord :
- `regles_pour(« réorganiser l'arborescence du vault »)` a rendu `[]` ;
- puis `chercher` et `lire`.

`list_scheduled_tasks` et `list_task_runs` ont été lancés en lecture. Quatre petits scripts de comptage, en lecture seule, ont été écrits dans le scratchpad de la session (`…\scratchpad\entetes-vault.mjs`, `entetes-wiki.mjs`, `liens-vault.mjs`, `liens-vault-2.mjs`). Aucun fichier de données de prospects n'a été ouvert.

## 0. Chiffres clés

| Mesure | Valeur | Preuve |
|---|---|---|
| Notes `.md` (hors `.obsidian/`) | **1 088** : 1 081 dans les dossiers visibles + 7 dans `.agents/` et `.claude/` | `find . -type f -name "*.md" -not -path "./.obsidian/*" -not -path "./.git/*" -not -path "./.trash/*" \| wc -l` → `1088` |
| Réseau `wiki/` | 760, soit 70 %. 624 de ces notes sont **générées** (82 % du wiki) | `grep -l -r '^genere: catalogue-outils'` → `624` |
| Fils `inbox/sessions/` | 184 : 86 `integre`, **98 `a-integrer`** | `grep -h '^statut:' *.md \| sort \| uniq -c` |
| Notes d'avant le 26/10 (hors wiki et inbox) | 137 : 4 à la racine + 133 dans 13 dossiers | voir §1.2 |
| En-tête YAML | 961 avec, 127 sans (123 notes historiques + 4 fichiers de `.claude/skills`) | `entetes-vault.mjs` |
| Fichiers non `.md` | 45 : 20 json, 15 pdf, 4 docx, 2 txt, 1 csv, 1 png, `.gitkeep`, `.gitignore` | `find … -not -name "*.md" \| sed 's/.*\.//' \| sort \| uniq -c` |
| Poids | 19 Mo hors `.obsidian/` | `du -sh --exclude=.obsidian .` |
| Git | **aucun dépôt** | `git -C SaaS rev-parse` → `fatal: not a git repository` |
| Sauvegarde | `C:/Users/benja/Documents/SaaS-sauvegarde-2026-10-26/`, 136 notes, d'avant le wiki | `find … -name '*.md' \| wc -l` |
| Modèles, `.canvas`, `.base`, `memoire/` | **aucun** | `find -name "*.canvas"`, `"*.base"`, `-iname "*templat*"`, `-iname "*memoire*"` → vides (seul `wiki/outils/Cerveau-et-memoire/` ressort) |
| Plugins communautaires Obsidian | **aucun** | `ls .obsidian/plugins` → `No such file or directory` |

## 1. Arborescence

### 1.1 Racine (4 notes)

| Fichier | Taille et date | Rôle |
|---|---|---|
| `CLAUDE.md` | 21 798 o, modifié le 19/10 à 15 h 11 | consignes de Claude (voir §3) |
| `Récap-Projet.md` | 45 840 o, 152 lignes, modifié le 20/10 à 21 h 51 | « la boussole » |
| `Bienvenue.md` | 2 973 o | carte d'origine (phase problem-finding, août) |
| `Resume-Travail-Preparation.md` | 3 793 o | état au 05/08, périmé |

Trois fichiers techniques s'y ajoutent :
- `.claude-obsidian.json` : schéma `claude-obsidian.workspace.v1`, avec `source_inbox: inbox` et `legacy_raw: .raw` ;
- `.gitignore`, qui ignore `.vault-meta/`, `.mcp.json`, `.obsidian/workspace*.json` et `.trash/`, alors qu'il n'y a pas de dépôt ;
- les dossiers cachés `.raw/` (un `.manifest.json` vide) et `.vault-meta/ingestion-2026-10-26/` (7 manifestes json de l'ingestion du 26/10).

### 1.2 Premier niveau

| Dossier | `.md` récursif / à sa racine | Autres fichiers | Contenu | Avec en-tête YAML |
|---|---|---|---|---|
| `wiki/` | 760 / 4 | 2 json | réseau claude-obsidian (créé le 26/10) | 760 / 760 |
| `inbox/` | 184 / 0 | `.gitkeep` | uniquement `inbox/sessions/` | 184 / 184 (`type: session-brute`) |
| `Produit/` | 54 / 54 | 0 | sessions, journées, écosystème, produit | 6 / 54 |
| `Coentreprise/` | 29 / 1 | 0 | cerveau de la coentreprise d'agents : `_Index-Coentreprise.md` + 4 pôles × 7 notes | 4 / 29 |
| `Prospection/` | 21 / 19 | **12** (9 json, 1 csv, 2 txt) | méthode, bilans et **données de prospects** | 2 / 21 |
| `Recherche/` | 8 / 8 | 0 | archives d'août, `Videos-decortiquees.md`, `Concurrent-ReplyPro.md` | 1 / 8 |
| `Legal/` | 7 / 6 | 20 (pdf, docx, png) | contrats, micro-entreprise, DPA | 0 / 7 |
| `Problemes/` | 6 / 6 | 0 | archives, dont `MODELE-Fiche-Probleme.md` | 0 / 6 |
| `Validation/` | 2 | 0 | `_Index-Validation.md`, `Guide-interview-artisans-FR.md` | 0 |
| `Decisions/` | 1 | 0 | `Journal-Decisions.md` (88 420 o, 768 lignes) | 0 |
| `Agents/` | 1 | 0 | `Journal.md` (18 lignes de comptes rendus d'agents) | 0 |
| `Fondateurs/` | 1 | 0 | `Profil-Fondateurs.md` | 0 |
| `Idees-Vrac/` | 1 | 0 | `Inbox.md` (284 o) | 0 |
| `Missions/` | 1 | 0 | `Recherche-2026-10-27.md` (missions, emplois, Roblox : hors Presti) | 1 |
| `Scoring/` | 1 | 0 | `_Index-Scoring.md` | 0 |
| `.claude/` (caché) | 6 | 0 | skills du vault : `vault-organizer`, `saas-problem-finder` (+ 4 références) | 2 / 6 |
| `.agents/` (caché) | 1 | 0 | `rules/orchestre.md`, règle Antigravity `trigger: always_on` | 1 |

### 1.3 Deuxième niveau (troisième pour `wiki/outils`)

| Chemin | Notes `.md` |
|---|---|
| `wiki/concepts/` | 80 |
| `wiki/entities/` | 15 |
| `wiki/sources/` | 22 |
| `wiki/cartes/` | 6 (`type: meta`) |
| `wiki/meta/ledgers/` | 0 (deux json vides, `claim-ledger.json` et `source-ledger.json`) |
| `wiki/outils/` | **633** = 9 synthèses + 624 notes d'outils générées, réparties en 8 dossiers : `Video-et-motion/` 175, `Code-et-fonctionnalites/` 124, `Design-et-interface/` 116, `Prospection-et-chasse/` 110, `Cerveau-et-memoire/` 40, `Autres-outils/` 39, `Reverse-engineering-et-references/` 15, `Appels-IA/` 5 |
| `inbox/sessions/` | 184 |
| `Coentreprise/animation/`, `audit/`, `gestion/`, `mails/` | 7 chacun : `socle-*`, quatre `brain-*`, `journal.md`, `protocole.md` |
| `Prospection/emails-artisans/` | 2 `.md` + 7 json + 1 csv (données de prospects) |
| `Legal/DPA-archives-2026-10-21/` | 1 (`INDEX.md`) + 11 pdf + 1 png |
| `Legal/_to_delete/` | 0 (`Accord-fondateurs-Presti-80-20.docx` et `.pdf`) |

### 1.4 Repères demandés

#### `wiki/`

Présent depuis le 26/10. Il contient :
- `index.md` : 7 cartes (les 6 thématiques + la carte des outils), 80 concepts, 15 entités, 22 sources, « Aucune question enregistrée » ;
- `hot.md` : contexte récent, mis à jour le 29/10 à 9 h 30 ;
- `overview.md` : six territoires ;
- `log.md` : quatre entrées, à savoir la migration « adopt » du 26/10, l'ingestion de 123 notes du 26/10, le rangement du 26/10 et le rattrapage du 29/10 (« 86 fils `inbox/sessions` intégrés »).

En-tête commun des notes : `type, title, status, created, updated, tags, aliases, sources, origine` (`wiki/concepts/Système neuronal du cerveau.md:1-19`).

Répartition par `type` : concept 88 (80 + 8 synthèses d'outils), meta 9 (index, hot, log et les 6 cartes), entity 15, source 22, overview 1, carte 1 (`Carte-des-outils.md`), outil 624.

#### `Decisions/`

Une seule note, entrées datées, la plus récente en tête (`Journal-Decisions.md:3`, « ## 2026-10-29 — Décisions du 27 au 29/10 »). Un second registre vit hors du vault : `presti-ops/QG/DECISIONS.md`, indexé par le cerveau sous `qg/`.

#### `Produit/` (54 notes, sans sous-dossier)

| Famille | Nombre | Notes |
|---|---|---|
| Sessions | 12 | `Session-*` |
| Journées | 6 | `Journee-2026-10-19` à `Journee-2026-10-29` |
| Passation et rattrapages | 3 | `Passation-2026-10-19`, `Rattrapage-2026-09-28-au-10-10-Ecosysteme`, `Rattrapage-2026-10-11-au-10-17-Films-Inscrit-Regles` |
| Écosystème | 14 | `Ecosysteme-*-2026-09-2x` |
| Produit | 12 | `Architecture`, `Architecture-v2-Devis-Factures-SiteClient`, `Audit-Securite-et-corrections`, `Carte-du-code` (générée), `Cerveau-site-v2`, `Coeur-de-cerveau`, `Landing-et-objections`, `Modeles-IA-par-offre`, `Plan-Developpement`, `Roadmap-Securite-Site-IA-Abonnements`, `SEO-devis-2026-10-27`, `Tarifs` |
| Outillage | 3 | `Antigravity`, `Orchestre`, `Prompt-Codex-2026-09-15` |
| Entreprise et légal | 3 | `INPI-marque-Presti`, `Nom-entreprise`, `Prospection-Cadre-Legal-2026-09-27` |
| Étude de marché | 1 | `Etude-Marche-Site-Vitrine-Artisans-2026-09-27` |

Il n'y a encore aucune note `Apprentissage-*`.

#### `Prospection/` (21 notes)

| Famille | Nombre | Notes |
|---|---|---|
| Méthode et bilans | 10 | `Guide-Presti-Demarchage`, `Objections-reponses`, `Audit-prospection-2026-10-26`, `Chasse-corrigee-2026-10-26`, `Enrichisseur-sites-2026-10-26`, `Harvey-source-artisans-2026-10-26`, `IA-caller-entrainement-2026-10-26`, `Flyers-cartes-Brevo-2026-10-19`, `Email-artisans-2026-09-15`, `Publications-Presti-2026-09` |
| Archives d'Alexandre | 2 | `Kit-Alexandre`, `Brief-Alexandre-Artisans` |
| Influenceurs | 2 | `Influenceurs-artisans-2026-10-27` (11 e-mails, exclue de l'index), `Messages-influenceurs-2026-10-27` |
| **Données de prospects** | **7** | `FB-10-electriciens-a-coller`, `Lot-20x20-2026-09-14`, `Lot-Insta-FB-2026-09-10`, `corbeille-gmail-2026-09-15`, `emails-artisans/brouillons-2026-09-15`, `emails-artisans/envois-2026-09-15`, et une fiche nominative `prospect-*-2026-10-21.md` |

S'y ajoutent 12 fichiers de données, non ouverts : `cibles-instagram-2026-09-15.json`, `cibles-instagram-2026-09-15.INVENTEES-refusees.json`, `deja-contactes-email.txt`, `deja-contactes-instagram.txt`, sept `emails-artisans/*.json` et `emails-artisans/envoi-2026-09-15.csv`.

#### `inbox/sessions/` (184 fils, du 26/10 au 01/11)

Répartition par jour : 2 le 26/10, 71 le 27/10, 3 le 28/10, 77 le 29/10, 10 le 30/10, 13 le 31/10, 8 le 01/11.

- **109 fils viennent du crochet** : 105 `…-fin.md` et 4 `…-avant-compression.md`.
- **75 fils viennent des tâches et des sessions** :
  - 26 `presti-envoi-prospection`, 11 `presti-chasse-artisans-reseaux`, 6 `presti-repondeur-prospection`, 5 `presti-reponses-messages`, 5 `harvey-boucle-quotidienne`, 3 `presti-contact-reseaux`, 2 `presti-directeur-bilan-soir`, 2 `post-midi*` ;
  - un chacun pour `presti-file-prospection-matin`, `chasse-prospects-quotidienne` et `croissance-reseaux` ;
  - 12 notes de chantier : `pub-v10`, `pub-v13`, `pub-v14`, `pub-v15`, `pub-v21-inventaire-hook-v2`, `systeme-pub-10`, `skills-motion`, `presti-ia-gratuite-freellmapi`, `presti-comptes-fournisseurs`, `influenceurs-artisans`, `entrainement-cold-caller`, `elargir-chasse`.

Champ `dossier` : 64 fils viennent de sessions ouvertes sur `C:/Users/benja/Documents/ofm`, 44 sur `C:/Users/benja/Documents/presti`.

#### `memoire/`

**N'existe pas dans le vault.** « memoire » est un préfixe du cerveau qui désigne `C:/Users/benja/.claude/projects/C--Users-benja-Documents-ofm/memory/` (130 notes). Les mémoires des projets presti (34 notes) et presti-ops (4) sont indexées sous `memoire-presti/` et `memoire-ops/`.

#### Modèles

Il n'y a ni `Templates/` ni `_templates/`. Le seul gabarit est `Problemes/MODELE-Fiche-Probleme.md`, que le skill `vault-organizer` duplique à la main. Les vrais gabarits sont écrits dans le code :
- l'en-tête `session-brute` (`cerveau/src/capture-session.mjs:53-60`) ;
- l'en-tête `outil` (`cerveau/scripts/catalogue-outils.mjs:180-181`) ;
- l'en-tête wiki de claude-obsidian.

Le plugin claude-obsidian embarque des modèles LYT, PARA et Zettelkasten (`C:/Users/benja/.claude/plugins/cache/agricidaniel-claude-obsidian/claude-obsidian/3.0.1/skills/wiki-mode/templates/{lyt,para,zettel}`), jamais copiés dans le vault.

#### `.canvas` et `.base`

Aucun fichier, alors que les plugins de base Canvas et Bases sont actifs.

### 1.5 Liens et noms (script `liens-vault.mjs`)

Le vault compte environ 3 505 liens `[[…]]` : 3 003 dans `wiki/`, dont 1 891 avec un chemin (surtout `[[outils/…]]`) ; 169 dans `Produit/` ; 139 à la racine ; 56 dans `Decisions/` ; 55 dans `Coentreprise/` ; 23 dans `Prospection/` ; 17 dans `inbox/`.

**Liens morts (approximatifs) : 64, dont 0 dans `wiki/`.**
- 30 dans `Coentreprise/` et 30 dans `Produit/`. Ils visent surtout des mémoires de Claude Code hors du vault, par exemple `[[ecosysteme-presti]]` (×5) dans `Produit/Ecosysteme-IA-Registre-2026-09-25.md` ou `[[presti-state]]` dans `Coentreprise/*/protocole.md`.
- 3 dans `.claude/skills/vault-organizer/SKILL.md`, qui sont des exemples (`[[liens]]`).
- 1 dans `Recherche/`.

**10 noms de notes en double**, à surveiller avant tout déplacement :
- `journal` ×5 : `Agents/Journal.md` et les 4 `Coentreprise/*/journal.md` ;
- `protocole` ×4 ;
- 4 notes `brain-*`, présentes chacune ×4 ;
- `index` ×2 : `wiki/index.md` et `Legal/DPA-archives-2026-10-21/INDEX.md` ;
- `orchestre` ×2 : `Produit/Orchestre.md` et `.agents/rules/orchestre.md` (la carte de la prospection lie `[[Orchestre]]`) ;
- `hyperframes` ×2 : `wiki/entities/HyperFrames.md` et `wiki/outils/Video-et-motion/hyperframes.md` ;
- `SKILL` ×2.

## 2. Le dossier `.obsidian/`

**Fichiers présents :**
- `app.json` et `appearance.json`, tous deux `{}` ;
- `core-plugins.json` ;
- `graph.json`, réglé (orphelins visibles, distance des liens 250) ;
- `snippets/vault-colors.css` (620 o, venu du modèle claude-obsidian) ;
- `workspace.json`, dont les derniers fichiers ouverts sont `Coentreprise/audit/brain-architecture.md`, `Recherche/Salve-1-Candidats-2026-08-05.md`, `Récap-Projet.md` et `Fondateurs/Profil-Fondateurs.md`.

Ces fichiers ont été réécrits le 29/10 à 22 h 56.

**Plugins communautaires : 0.** Il n'y a pas de dossier `plugins/` ni de `community-plugins.json`, donc ni Templater, ni Dataview, ni Obsidian Git.

**Plugins de base : 21 actifs sur 31.**
- Actifs : file-explorer, global-search, switcher, graph, backlink, canvas, outgoing-link, tag-pane, properties, page-preview, daily-notes, templates, note-composer, command-palette, editor-status, bookmarks, outline, word-count, file-recovery, **sync**, **bases**.
- Inactifs : footnotes, slash-command, markdown-importer, zk-prefixer, random-note, slides, audio-recorder, workspaces, publish, webviewer.

**Dossier de modèles : non réglé.** Le plugin de base « templates » est actif, mais `templates.json` n'existe pas, et Templater n'est pas installé. `daily-notes` est actif sans `daily-notes.json`, et aucune note quotidienne n'a été créée.

**Application.** Obsidian est installé (`C:/Users/benja/AppData/Local/Programs/Obsidian/Obsidian.exe`). Le coffre SaaS est enregistré et marqué ouvert dans `C:/Users/benja/AppData/Roaming/obsidian/obsidian.json` (dernière ouverture le 26/10 à 20 h 48 UTC). Le coffre `ofm/OFM` y est aussi enregistré.

**Côté Claude Code (et non Obsidian).** Le plugin **claude-obsidian 3.0.1** est activé au niveau utilisateur (`enabledPlugins` : `claude-obsidian@agricidaniel-claude-obsidian=true`). Il apporte :
- 15 skills : wiki, wiki-ingest, wiki-query, wiki-lint, wiki-cli, wiki-fold, wiki-mode, wiki-retrieve, save, canvas, obsidian-bases, obsidian-markdown, defuddle, autoresearch, think ;
- deux crochets, `SessionStart` et `Stop` (`hooks/hooks.json`).

Les variables `CLAUDE_OBSIDIAN_VAULT=C:/Users/benja/Documents/SaaS` et `CLAUDE_OBSIDIAN_SESSION_CONTEXT=1` sont dans `~/.claude/settings.json`. `python3` est présent (Python 3.12.10).

## 3. Le `CLAUDE.md` du vault (21 798 o, modifié le 19/10 à 15 h 11)

Il compte six sections.

1. **Contexte (l.5-13).** Le SaaS est indépendant de l'agence OFM et de la chaîne YouTube, détenu à 100 % par Benjamin, qui est seul depuis le 08/09/2026. La section décrit ce que fait Presti.
2. **⚠️ Phase actuelle : produit en production (l.15-48).**
   - Lire d'abord `[[Passation-2026-10-19]]`.
   - Un bloc du 19/10 en 8 points : écosystème en pause depuis le 11/10, premier inscrit le 13/10, pubs v5 et v6, CRM « top 8 », sécurité 0160-0161, refonte A/B sur `refonte-1018`, ordre de prospection. Le point 8 est une règle : **« le vault s'écrit à chaque chantier livré, et au moins une fois par jour de travail »**, avec une note dans `Produit/`, les décisions dans `Journal-Decisions` et un bloc dans CLAUDE.md.
   - Le code, les adresses en ligne, et l'objectif n°1 : l'acquisition.
   - Trois blocs datés : 09/09 (Gabriel et le risque de travail dissimulé), 14/09 matin (production réparée, démos v2, postage, appels, exécutants), 14/09 après-midi (v16, orchestre autonome, démo Lestraque).
   - Des renvois vers les notes de session, et la remarque que la mémoire fine vit dans la mémoire Claude Code du projet OFM.
3. **Où trouver les infos (l.50-68).**
   - `Produit/Carte-du-code.md` : générée, à ne pas éditer, à lire avant toute tâche.
   - `Produit/Antigravity.md` : « On n'écrit dans ce vault que par une tâche dont le périmètre commence par `SaaS/` ».
   - `Cerveau-site-v2`, `Orchestre`, les sessions, les rattrapages, `Publications-Presti-2026-09`.
   - Le rôle de chaque dossier : `Produit/`, `Decisions/`, `Coentreprise/` (« alimenté automatiquement » par `coentreprise.mjs sync-down`), `Legal/`, `Prospection/` (archives d'Alexandre « aucune valable telle quelle »), `Fondateurs/`, et les archives de la phase problem-finding.
4. **Skills dispo (l.70-88).** `vault-organizer` et `saas-problem-finder`, plus linkedin-skills v1.0.33 (11 skills) et facebook-skills v1.0.18 (8 skills), avec trois réserves : mode brouillon sans clé, textes écrits pour l'anglais, Pages Facebook seulement.
5. **Règles de travail (l.90-101).**
   - n°1 Tout noter.
   - n°2 Anti-vibecoding.
   - n°3 Anti-fabrication.
   - n°4 White-label.
   - n°5 Corrections incrémentales.
   - n°6 En fin de gros chantier, mettre à jour `Produit/`, `[[Récap-Projet]]` et `[[Journal-Decisions]]`.
   - n°7 « Poussé » n'est pas « déployé ».
   - n°8 Une photo de démo a une provenance prouvée.
   - n°9 Une chaîne qui pousse s'arrête au premier FAIL (`&&`, jamais `;`).
   - n°10 Un geste d'animation se prouve par des images-clés.
6. **Fondateurs (l.103-105).** Le Gmail de Benj est le seul compte fondateur. Le compte d'Alexandre n'a plus de privilège depuis `0084_sortie_partenaire.sql`.

**Écarts constatés :**
- `grep -c` donne 0 pour `wiki`, `inbox`, `hot`, `n8n`, `hermes` et `orca` dans ce fichier.
- Sa carte ignore aussi `Agents/` et `Missions/`.
- Le fichier date d'avant l'adoption de claude-obsidian (26/10).

La règle de non-déplacement existe ailleurs : « les notes d'avant le 26/10 ne bougent pas : le réseau les relie, il ne les déplace pas » (`wiki/concepts/Système neuronal du cerveau.md`, §2), et « vault adopté sans déplacer de note » (`Decisions/Journal-Decisions.md:36`).

## 4. Le serveur MCP « cerveau » (`C:/Users/benja/Documents/cerveau`, paquet `cerveau-presti` 1.0.0)

### 4.1 Lancement

C'est un serveur **stdio**, déclaré au niveau utilisateur dans `C:/Users/benja/.claude.json` (`mcpServers.cerveau`, sans variable d'environnement) :

```
C:\Program Files\nodejs\node.exe  C:\Users\benja\Documents\cerveau\src\mcp.mjs
```

La commande d'installation d'origine est `claude mcp add -s user cerveau -- node …\src\mcp.mjs` (`LISEZMOI.md:50`). Le serveur parle JSON-RPC sans dépendance ; « Rien ne sort de la machine » (`src/mcp.mjs:2-3`).

### 4.2 Les 4 outils (`src/mcp.mjs:9-30`)

| Outil | Ce qu'il fait |
|---|---|
| `chercher(question, k≤20)` | recherche BM25, plus embeddings quand ils existent |
| `lire(chemin, section)` | fichier indexé, entier ou une section, tronqué à 12 000 caractères. Chemins logiques : `vault/…`, `memoire/…`, `presti/…`, `qg/…`, `references/…`, `skills/…` |
| `regles_pour(tache, k)` | règles marquées comme telles, plus 6 déclencheurs fixes : publication, TikTok, migration, arrêt de processus, pare-feu de l'usine, pousser ou déployer (`src/config.mjs:93-100`) |
| `quoi_de_neuf(depuis)` | fichiers modifiés depuis une date ; 2 jours par défaut, 60 au plus |

### 4.3 Ce qu'il indexe

Sources : `src/config.mjs:23-33`. État au 01/11 à 13 h 48 UTC, lu dans `data/indexation.json` et `data/index.json`.

| Source | Racine | Motif | Fichiers indexés |
|---|---|---|---|
| `vault` | `Documents/SaaS` | tout `.md`, récursivement, y compris `wiki/`, `inbox/sessions/` (184), `.claude/` et `.agents/` | 1 074 (3 973 morceaux) |
| `memoire` | `~/.claude/projects/C--Users-benja-Documents-ofm/memory` | `*.md` à la racine | 130 |
| `memoire-presti` | `…/C--Users-benja-Documents-presti/memory` | idem | 34 |
| `memoire-ops` | `…/C--Users-benja-Documents-presti-ops/memory` | idem | 4 |
| `presti` | `Documents/presti` | `CLAUDE.md`, `plans/**`, `docs/**` | 316 |
| `qg` | `Documents/presti-ops/QG` | `*.md` | 10 |
| `references` | `Documents/presti-ops/references` | `*/DECOMPOSITION.md` | 7 |
| `skills` | `Documents/presti/.claude/skills` | `*/SKILL.md` (suit les liens) | 79 |

Total : 1 654 fichiers, 9 392 morceaux, 16 fichiers exclus.

**Dossiers jamais parcourus** (l.36) : `contexte-cloud`, `.git`, `node_modules`, `.obsidian`, `.next`, `.trash`, `.venv`, `dist`, `build`.

**Exclusions :**
- par chemin (l.39-50) : `presti-secrets`, `.env`, les données de prospects (`a-contacter`, `signaux`, `lot-`, `cibles-`, `deja-contactes`, `corbeille-`, `appels-`, `a-coller`, `^vault/Prospection/emails-artisans/`) et les tableaux `.csv`, `.tsv`, `.xls(x)` ;
- par contenu (l.56-71) : motifs de secrets, 3 e-mails ou plus, 2 téléphones ou plus.

**Dans le vault, 14 notes sont exclues :**
- 6 de `Prospection/` par leur chemin ;
- 2 par leur contenu : `Produit/Etude-Marche-Site-Vitrine-Artisans-2026-09-27.md` (5 téléphones) et `Prospection/Influenceurs-artisans-2026-10-27.md` (11 e-mails) ;
- **6 faux positifs** : les 5 notes de `wiki/outils/Appels-IA/` et `wiki/outils/Appels-IA.md`, attrapées par le motif `appels-` (l.46).

À l'inverse, `Prospection/prospect-*-2026-10-21.md` (fiche nominative) et `Prospection/Messages-influenceurs-2026-10-27.md` **sont indexées** : vérifié dans `index.json`, `exclu` absent.

**Mode de recherche.** La requête faite pendant l'inventaire est revenue en `"mode": "bm25"`. Les embeddings `granite-embedding:278m` passent par Ollama en local sur 127.0.0.1:11434 (l.80-88), et `data/vecteurs.json` date du 19/10.

### 4.4 Ce qui tourne autour du MCP

- **Crochet `UserPromptSubmit`** (`src/hook.mjs`, déclaré dans `~/.claude/settings.json`). Il injecte au plus 3 extraits et 1 500 caractères, abandonne au bout de 1,5 s, et n'injecte rien si la RAM libre passe sous 800 Mo (`config.mjs:75`). Il interroge d'abord `POST /api/injecter` sur le serveur local.
- **Interface HTTP** `src/serveur.mjs` sur **127.0.0.1:8810** (l.181-185). Elle tourne : pid 7556, démarré le 01/11 à 11 h 11 (`Get-Process`).
- **Tâche Windows « Cerveau Presti »** (`scripts/installer-tache.ps1`) : toutes les 15 minutes et à l'ouverture de session, elle lance `scripts/reindexer.mjs` (indexation incrémentale, journal tenu sous 2 Mo, relance de l'interface si besoin). État Ready, dernier passage le 01/11 à 15 h 18, code de retour 0.

### 4.5 Sait-il écrire ?

**Le MCP n'écrit rien dans le vault.**
- Ses quatre outils ne font que lire l'index.
- `lire` refuse tout chemin qui sort de la racine de sa source (`recherche.mjs:219`).
- Seul effet de bord : une ligne par appel dans `cerveau/data/journal.jsonl` (`mcp.mjs:59`, `journal.mjs:10`).

L'interface HTTP, elle, écrit :
- `POST /api/tache` écrit un brouillon dans `cerveau/data/taches/<id>.md`, le fait valider par `presti/scripts/orchestre.mjs valider`, puis le copie dans `presti/.orchestre/file/<id>.md` (`serveur.mjs:113-126`) ;
- `POST /api/reindexer` relance l'indexation.

Les écritures dans le vault viennent d'autres scripts du même dépôt (voir §5).

### 4.6 Branchements et résidus

- **Hermes** n'est pas branché au cerveau : `C:/Users/benja/AppData/Local/hermes/config.yaml` n'a qu'un `# mcp_servers:` commenté (l.1635), et aucun fichier yaml, md ou json d'Hermes ne cite le vault (`grep -r -l "Documents/SaaS"` → vide).
- **Résidus** : 4 fichiers `data/index.json.<pid>.tmp` d'environ 16 Mo chacun (27/10, 28/10, et deux le 29/10), laissés par des indexations interrompues.

## 5. Les automatismes qui touchent le vault

### 5.1 Qui écrit où

| Chemin du vault | Écrit par | Quand | Preuve |
|---|---|---|---|
| `inbox/sessions/<AAAA-MM-JJ>-<HHhMM>-<8 car. du session_id>-fin.md` et `-avant-compression.md` | crochets Claude Code `SessionEnd` et `PreCompact` : `"C:/Program Files/nodejs/node.exe" "C:/Users/benja/Documents/cerveau/src/capture-session.mjs"` | fin de chaque session, avant chaque compression, toutes sessions confondues | `~/.claude/settings.json` (crochets) ; `capture-session.mjs:9-10, 52-60` |
| `inbox/sessions/AAAA-MM-JJ-HHhMM-<tâche>.md` | 17 tâches planifiées (point 3 de l'en-tête « Réseau neuronal d'abord », dont `presti-ligne-editoriale` via le workflow `post-du-jour.js`) et le workflow `pub-10-sur-10.js` | à chaque passe | `scheduled-tasks/presti-envoi-prospection/SKILL.md:9` ; `post-du-jour.js:98,116` ; `pub-10-sur-10.js:230` |
| `Produit/Journee-AAAA-MM-JJ.md`, tête de `Decisions/Journal-Decisions.md`, `wiki/hot.md` (réécrit), tête de `wiki/log.md`, `wiki/concepts/*`, `wiki/cartes/*`, `wiki/index.md`, et le passage des fils en `statut: integre` | tâche `presti-rangement-vault-soir` | 21 h 30 | `presti-rangement-vault-soir/SKILL.md:15-19` |
| `wiki/outils/**` : 624 notes `genere: catalogue-outils` et 9 synthèses | `cerveau/scripts/catalogue-outils.mjs`, lancé par le rangement du soir. Il **supprime puis réécrit** chaque soir les notes générées | chaque soir | `catalogue-outils.mjs:11-12, 170-173, 179, 198, 202` |
| `Produit/Carte-du-code.md` | `presti/scripts/orchestre.mjs contexte` (`"vault":"../SaaS"`, `"carteVault":"Produit/Carte-du-code.md"` dans `presti/.orchestre/orchestre.json`), relancé par le crochet PostToolUse du projet presti, `scripts/hooks/contexte-fond.mjs`, au plus une fois par minute après un Edit ou un Write de code | en continu ; dernière écriture le 01/11 à 15 h 19 | `orchestre.mjs:109, 919` ; `contexte-fond.mjs:2-6` |
| `Coentreprise/**` | `presti/scripts/coentreprise.mjs sync-down` | à la main | `coentreprise.mjs:20-21` |
| `Agents/Journal.md` | `cerveau/src/file-agents.mjs` (agents « Araignée » et « Chasseur ») et la tâche `presti-reponses-messages` | à chaque tâche | `file-agents.mjs:18-19` |
| `Produit/Apprentissage-AAAA-MM-JJ.md`, une section datée dans 4 concepts (`Format d'e-mail froid artisan`, `Chasse aux plaintes publiques - méthode`, `Méthode marketing vidéo - lignes et mesure`, `Objections et réponses préparées`), `wiki/hot.md`, et `inbox/sessions/AAAA-MM-JJ-apprentissage-hebdo.md` | tâche `presti-apprentissage-hebdo` | dimanche 20 h | `presti-apprentissage-hebdo/SKILL.md:17-20` |

**Lecteurs seulement.** Le crochet `SessionStart` de claude-obsidian injecte `wiki/hot.md` en début de session. Son crochet `Stop` reste silencieux sauf besoin de reprise. Les deux « never write knowledge, update `wiki/hot.md`… » (`…/claude-obsidian/3.0.1/hooks/README.md`).

### 5.2 `presti-rangement-vault-soir`

**Planification.** `30 21 * * *` (affichée « 09:41 PM » à cause d'une gigue de 639 s), **active**. Prochaine exécution le 01/11 à 20 h 40 UTC.

**Ce qu'elle fait** (`SKILL.md`) :
1. Elle lit les mémoires modifiées dans la journée (3 projets), `git log --since=midnight` du dépôt presti, `presti-ops/QG/ETAT.md` et `DECISIONS.md`, `SaaS/Agents/Journal.md`, et tous les fils en `statut: a-integrer`.
2. Elle écrit ce que liste le tableau 5.1. `hot.md` doit rester sous 500 mots. Les fils intégrés passent en `statut: integre` ; « on ne supprime rien ».
3. Elle lance `contradictions.mjs`, `catalogue-outils.mjs`, la réindexation, `preuve.mjs`, puis le lint claude-obsidian en lecture seule.
4. Elle poste un message dans Slack `#presti-auto`.

Ses interdits : modifier un fichier de code, supprimer une note, écrire un secret ou une donnée de prospect.

**État réel** (`list_task_runs`, 12 passages au total) :
- dernier succès le **29/10 à 08 h 16 UTC** (« 86 fils de session sont intégrés ») ;
- **trois échecs depuis** : 29/10 à 20 h 41, 31/10 à 13 h 52 et 31/10 à 21 h 59 UTC, tous avec « You've hit your weekly limit ». Un échec semblable avait eu lieu le 23/10.

**Conséquences visibles :**
- **98 fils en attente** : 67 du 29/10, 10 du 30/10, 13 du 31/10, 8 du 01/11 ;
- aucune note `Journee-` après le 29/10 ;
- `hot.md`, `log.md` et `wiki/outils/` (`maj: 2026-10-29`) sont figés au 29/10 ;
- hors `inbox/`, seuls `Agents/Journal.md` (29/10 à 19 h 02) et `Produit/Carte-du-code.md` (01/11) ont bougé depuis.

### 5.3 `presti-apprentissage-hebdo`

**Planification.** `0 20 * * 0` (dimanche à 20 h, gigue de 369 s), **active**. Prochaine exécution le 01/11 à 19 h 06 UTC. Elle n'a **jamais tourné** (`totalRuns: 0`).

**Ce qu'elle fait :**
1. Elle consulte d'abord le cerveau : `regles_pour(« apprentissage hebdomadaire »)`, puis `wiki/hot.md` et `wiki/outils/Carte-des-outils.md`.
2. Elle mesure la semaine à partir de `REGISTRE-POSTS.md`, `ENVOIS.csv`, des réponses traitées, d'`OPPOSITIONS.csv`, des sorties de la chasse, de l'ia-caller (`rapport`, `apprendre --depuis-simulations`), du `digest.md` et de Slack.
3. Elle écrit ce que liste le tableau 5.1.
4. Elle poste un message Slack.

Il lui est interdit de modifier du code, une tâche ou un prompt d'agent.

### 5.4 La capture automatique des sessions

**Le crochet** est `SessionEnd` et `PreCompact`, qui lancent `capture-session.mjs`. Le crochet `orca-agent-hook.exe claude` est déclaré en plus sur 15 événements, mais pas sur `PreCompact`.

**Format des fichiers écrits :**
- en-tête : `type: session-brute`, `date`, `evenement`, `dossier` (le répertoire de travail), `statut: a-integrer` ;
- corps : les 60 dernières demandes de Benj et les 25 dernières réponses de plus de 80 caractères, coupées chacune à 1 200 caractères.

**Masquage** (l.14-19) : les clés Stripe et Anthropic, les JWT, les e-mails et les téléphones. **Les noms ne sont pas masqués.**

**Chemins :** le vault se change par la variable `CLAUDE_OBSIDIAN_VAULT`, mais le sous-dossier `inbox/sessions` est codé en dur (l.10).

## 6. Les dossiers attendus par Benj : aucun n'existe

Preuves :
- `find . -type d -regex '.*/[0-9][0-9][ _-].*'` → vide ;
- aucun dossier nommé ICP, Playbooks, Prompts, Références, Vidéos ou Automatisations, à part `wiki/outils/Video-et-motion/` et `wiki/outils/Reverse-engineering-et-references/`, qui sont générés.

Le cadrage du 01/11 l'avait déjà relevé (`presti/plans/011-cadrage-01-11/cadrage-00-synthese.md:38`, `cadrage-p1.md:345`).

Chemins relatifs à `C:/Users/benja/Documents/SaaS/` :

| Attendu | Notes actuelles qui y correspondent |
|---|---|
| `10 Presti/01 Produit` | `Produit/` (54 notes, détail au §1.4), avec en premier `Récap-Projet.md`, `Produit/Carte-du-code.md` (générée), `Produit/Tarifs.md`, `Produit/Modeles-IA-par-offre.md`, `Produit/Architecture.md`, `Produit/Plan-Developpement.md` et `Produit/Roadmap-Securite-Site-IA-Abonnements.md`. Côté wiki : `wiki/cartes/Carte - Produit et plans.md`, `wiki/concepts/Offres et grille tarifaire.md`, `Promesses produit et leur preuve.md`, `Positionnement automatique.md`, `Refonte 18-10 pistes A et B.md`, `Chronologie des chantiers 001 a 016.md`, `Carte du code - ou regarder.md`. |
| `10 Presti/03 ICP` | Une seule note ICP : `wiki/concepts/Profil du prospect idéal et portes d'entrée.md`, construite à partir de `presti-ops/prospection/PROFIL-PROSPECT-IDEAL.md`, `presti/plans/accroches-par-metier.md` et `presti-ops/agents-prospection/MANUEL.md`, tous hors du vault. Notes voisines : `wiki/concepts/Angles - demandes perdues et plainte publique.md`, `Problemes/Probleme-devis-voix-artisans.md`, `Recherche/Besoins-artisans-et-legal-devis-factures.md`, `Validation/Guide-interview-artisans-FR.md`, `Produit/Etude-Marche-Site-Vitrine-Artisans-2026-09-27.md` (exclue de l'index). |
| `10 Presti/04 Décisions` | `Decisions/Journal-Decisions.md`, note unique. Des décisions sont aussi recopiées dans les `Produit/Journee-*.md` et les `Session-*.md`. Un second registre existe hors du vault : `presti-ops/QG/DECISIONS.md`. |
| `30 Prospection/01 ICP` | La même note que `10 Presti/03 ICP` : le vault ne fait pas de différence entre les deux. |
| `30 Prospection/02 Playbooks` | `wiki/cartes/Carte - Prospection et relation artisan.md` (carte maîtresse), `Prospection/Guide-Presti-Demarchage.md`, `Prospection/Objections-reponses.md`, et 17 concepts de `wiki/concepts/` : `Premier message - présenter Presti.md`, `Format d'e-mail froid artisan.md`, `Conversation en quatre temps.md`, `Ordre des canaux de contact.md`, `Relances - prospection et produit.md`, `Un message par artisan puis cinq jours.md`, `Répondre aux artisans - méthode des relais.md`, `Objections et réponses préparées.md`, `Angles - demandes perdues et plainte publique.md`, `Chasse aux plaintes publiques - méthode.md`, `Démarchage LinkedIn - cadence et règles.md`, `Offre exacte et interdits en prospection.md`, `Garde-fous d'envoi e-mail et délivrabilité.md`, `Contrôles de relecture et ce qui fait robot.md`, `Cadre légal et notice de prospection.md`, `Règles de Benj — prospection et contact.md`, `Publications réseaux - règle de vérité.md`. Bilans dans `Prospection/` : `Audit-prospection-2026-10-26.md`, `Chasse-corrigee-2026-10-26.md`, `Harvey-source-artisans-2026-10-26.md`, `Enrichisseur-sites-2026-10-26.md`, `IA-caller-entrainement-2026-10-26.md`. Entités : `wiki/entities/Harvey.md`, `Harvey - source de candidats.md`, `Agents de prospection presti-ops.md`, `ia-caller.md`. |
| `40 Vidéos/04 Références` | `wiki/concepts/Références de Benj et ce qu'elles enseignent.md` (synthèse de 6 `DECOMPOSITION.md` et de l'`ANALYSE.md` du 25/10), `Copier une référence - planche et copie plan par plan.md`, `Règles de Benj — barre de qualité vidéo et références.md`, `Verdicts de Benj sur les films - historique.md`, `Formats et moteurs de pub - Three.js, écran filmé, mème.md`, `Rythme d'une pub - mots par seconde et dynamisme.md`, `Juges vidéo et preuves visuelles.md`, plus `Recherche/Videos-decortiquees.md`, `Produit/Ecosysteme-Marketing-Reel-2026-09-25.md` et `wiki/cartes/Carte - Vidéo et pubs.md`. **Les références elles-mêmes sont hors du vault** : `C:/Users/benja/Documents/presti-ops/references/` (23 dossiers, dont 7 avec un `DECOMPOSITION.md` indexé sous `references/…`) et `C:/Users/benja/Documents/presti/videos/references-2026-10-25/ANALYSE.md`. |
| `50 Automatisations/04 Prompts` | Rien de dédié. Dans le vault : `Produit/Prompt-Codex-2026-09-15.md` (seule note nommée « Prompt »), `wiki/concepts/Labo IA - mesurer avant de modifier.md`, `Exécutants et routage des modèles.md`, `Methode Claude Code x executants.md`, `Règles des agents autonomes - AGENT-REGLES.md`, `wiki/entities/ia-caller.md`, `wiki/cartes/Carte - Outils IA et automatisation.md`, et `wiki/outils/Carte-des-outils.md` (généré ; il route les prompts vers `/prompt-master`). **Les prompts réels vivent hors du vault** : `C:/Users/benja/.claude/scheduled-tasks/<id>/SKILL.md` (23 dossiers, dont 22 tâches enregistrées et 8 actives), `C:/Users/benja/Documents/presti/.claude/workflows/{chasse-prospects,marketing-trio,post-du-jour,pub-10-sur-10}.js`, `C:/Users/benja/Documents/presti/plans/001-…016-*.md` (prompts numérotés, indexés sous `presti/plans/`), `C:/Users/benja/Documents/presti-ops/ia-caller/agent/prompt-systeme.md`. |

Parmi ces 7 chemins, aucun ne prévoit de place pour `Legal/`, `Fondateurs/`, `Coentreprise/`, `Agents/`, `Missions/` ni pour les archives (`Problemes/`, `Recherche/`, `Scoring/`, `Validation/`, `Idees-Vrac/`).

## 7. Ce qu'un déplacement casserait (chemins codés en dur)

| Chemin du vault | Qui en dépend |
|---|---|
| `inbox/sessions/` | `capture-session.mjs:10` ; 17 `SKILL.md` de tâches ; `post-du-jour.js` ; `pub-10-sur-10.js` ; le rangement du soir |
| `wiki/outils/` et `wiki/outils/Carte-des-outils.md` | `catalogue-outils.mjs:12`, qui y écrit ; en lecture : 14 tâches planifiées, `chasse-prospects.js:36`, `marketing-trio.js:36`, l'apprentissage hebdo |
| `wiki/hot.md`, `wiki/log.md`, `wiki/index.md`, `wiki/cartes/`, et les 4 concepts nommés au §5.1 | le rangement du soir, l'apprentissage hebdo, le crochet `SessionStart` de claude-obsidian (lit `wiki/hot.md`) |
| `Decisions/Journal-Decisions.md` | le rangement du soir ; `presti/scripts/savoir/lecons.mjs:28` ; `marketing-trio.js:37` |
| `Produit/` : `Journee-*`, `Apprentissage-*`, `Carte-du-code.md` | le rangement, l'apprentissage, `presti/.orchestre/orchestre.json` (`carteVault`), `presti/CLAUDE.md`, `SaaS/.agents/rules/orchestre.md`, `presti/scripts/usine.mjs:403` |
| `Récap-Projet.md` et `Produit/Orchestre.md` | `presti/scripts/vault-journal-qa.mjs:23-24`, `vault-journal-v18-qa.mjs:24-25` |
| `Prospection/cibles-instagram-2026-09-15.json` et `Prospection/deja-contactes-instagram.txt` | `presti/scripts/cibles-instagram-qa.mjs:11-12` |
| `Prospection/emails-artisans/` | l'exclusion du cerveau `config.mjs:48` : si ce dossier bouge, ces données de prospects **entrent dans l'index** |
| `Agents/Journal.md` | `file-agents.mjs:19`, le rangement du soir, `presti-reponses-messages` |
| `Coentreprise/` | `coentreprise.mjs:21` |
| `CLAUDE.md` à la racine | lu automatiquement par Claude Code ; cité par `presti/CLAUDE.md` |

**Côté cerveau :**
- les chemins logiques `vault/<chemin>` suivent le déplacement, et l'index se refait seul en 15 minutes ;
- `READMIS` et `DECLENCHEURS` ne visent que des fichiers `memoire/`, et `preuve.mjs` ne teste que des mémoires, donc ils ne sont pas touchés.

**Côté liens :** 1 891 liens du wiki contiennent un chemin (`[[outils/…]]`). Les autres se résolvent par le nom du fichier : ils survivent à un déplacement tant que les 10 noms en double du §1.5 ne deviennent pas ambigus.

## 8. Constats utiles pour la suite

1. **Deux couches qui ne se recouvrent pas.** D'un côté, 137 notes historiques rangées par type (`Produit`, `Decisions`, `Prospection`…), dont 123 sans en-tête YAML. De l'autre, 944 notes avec en-tête (`wiki/` 760 et `inbox/` 184). Le wiki est généré à 82 %.
2. **Le rangement du soir est en panne depuis le 29/10 au soir** (limite hebdomadaire) : 98 fils attendent d'être intégrés.
3. **Des données de prospects vivent dans le vault** : 7 notes et 12 fichiers dans `Prospection/`.
   - La fiche nominative et les messages aux influenceurs sont indexés par le cerveau, donc le crochet peut les injecter dans une session Claude Code.
   - Le plugin de base Sync est actif, mais je n'ai pas vérifié que le coffre est réellement synchronisé.
   - Les fils `inbox/sessions` ne masquent pas les noms.
4. **Le cerveau exclut à tort `wiki/outils/Appels-IA/`** (6 notes), à cause de son motif `appels-`.
5. **Rien n'est sous Git, et il n'existe aucune sauvegarde récente** : la seule, du 26/10, compte 136 notes et ne contient ni le wiki ni `inbox/`.
6. **Rien à migrer côté Obsidian** : ni modèle, ni Base, ni Canvas, ni plugin communautaire.
7. **Le `CLAUDE.md` du vault (19/10) ne décrit ni `wiki/` ni `inbox/`**, ni la répartition n8n / Hermes / Orca / MCP décidée le 01/11. Hermes n'est relié ni au cerveau ni au vault.

# SOURCES
C:/Users/benja/Documents/SaaS/CLAUDE.md
C:/Users/benja/Documents/SaaS/Bienvenue.md (l.10-49)
C:/Users/benja/Documents/SaaS/wiki/index.md
C:/Users/benja/Documents/SaaS/wiki/hot.md
C:/Users/benja/Documents/SaaS/wiki/overview.md
C:/Users/benja/Documents/SaaS/wiki/log.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Système neuronal du cerveau.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Profil du prospect idéal et portes d'entrée.md (en-tête)
C:/Users/benja/Documents/SaaS/wiki/concepts/Références de Benj et ce qu'elles enseignent.md (en-tête)
C:/Users/benja/Documents/SaaS/wiki/cartes/Carte - Vidéo et pubs.md, Carte - Outils IA et automatisation.md, Carte - Prospection et relation artisan.md, Carte - Produit et plans.md (liens seulement)
C:/Users/benja/Documents/SaaS/Decisions/Journal-Decisions.md (l.1-40 et titres)
C:/Users/benja/Documents/SaaS/.claude/skills/vault-organizer/SKILL.md
C:/Users/benja/Documents/SaaS/.agents/rules/orchestre.md
C:/Users/benja/Documents/SaaS/Agents/Journal.md (en-tête)
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-14h42-ea9f2e07-fin.md (en-tête)
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-10-27-07h48-presti-envoi-prospection.md (en-tête)
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-10-26-entrainement-cold-caller.md (en-tête)
C:/Users/benja/Documents/SaaS/.obsidian/core-plugins.json
C:/Users/benja/Documents/SaaS/.obsidian/app.json
C:/Users/benja/Documents/SaaS/.obsidian/appearance.json
C:/Users/benja/Documents/SaaS/.obsidian/graph.json
C:/Users/benja/Documents/SaaS/.obsidian/workspace.json (lastOpenFiles)
C:/Users/benja/Documents/SaaS/.claude-obsidian.json
C:/Users/benja/Documents/SaaS/.gitignore
C:/Users/benja/Documents/SaaS/.raw/.manifest.json
C:/Users/benja/Documents/SaaS/wiki/meta/ledgers/claim-ledger.json
C:/Users/benja/Documents/SaaS/wiki/meta/ledgers/source-ledger.json
C:/Users/benja/Documents/cerveau/src/config.mjs
C:/Users/benja/Documents/cerveau/src/mcp.mjs
C:/Users/benja/Documents/cerveau/src/hook.mjs
C:/Users/benja/Documents/cerveau/src/capture-session.mjs
C:/Users/benja/Documents/cerveau/src/journal.mjs
C:/Users/benja/Documents/cerveau/src/serveur.mjs
C:/Users/benja/Documents/cerveau/src/recherche.mjs (l.12-49, 179-232)
C:/Users/benja/Documents/cerveau/src/file-agents.mjs (grep)
C:/Users/benja/Documents/cerveau/scripts/reindexer.mjs
C:/Users/benja/Documents/cerveau/scripts/installer-tache.ps1
C:/Users/benja/Documents/cerveau/scripts/catalogue-outils.mjs (l.1-25, 150-211)
C:/Users/benja/Documents/cerveau/scripts/preuve.mjs (grep)
C:/Users/benja/Documents/cerveau/scripts/contradictions.mjs (grep)
C:/Users/benja/Documents/cerveau/package.json
C:/Users/benja/Documents/cerveau/.gitignore
C:/Users/benja/Documents/cerveau/LISEZMOI.md (grep)
C:/Users/benja/Documents/cerveau/data/indexation.json
C:/Users/benja/Documents/cerveau/data/index.json (résumé par source et liste des exclus, sans contenu)
C:/Users/benja/.claude/settings.json (crochets, noms des variables CLAUDE_OBSIDIAN_*, enabledPlugins)
C:/Users/benja/.claude.json (entrée mcpServers.cerveau : commande et arguments seulement)
C:/Users/benja/.claude/scheduled-tasks/presti-rangement-vault-soir/SKILL.md
C:/Users/benja/.claude/scheduled-tasks/presti-apprentissage-hebdo/SKILL.md
C:/Users/benja/.claude/scheduled-tasks/presti-envoi-prospection/SKILL.md (l.1-10)
C:/Users/benja/.claude/scheduled-tasks/*/SKILL.md (grep des chemins SaaS)
C:/Users/benja/.claude/plugins/cache/agricidaniel-claude-obsidian/claude-obsidian/3.0.1/hooks/hooks.json
C:/Users/benja/.claude/plugins/cache/agricidaniel-claude-obsidian/claude-obsidian/3.0.1/hooks/README.md
C:/Users/benja/Documents/presti/plans/011-cadrage-01-11/cadrage-00-synthese.md (§ Cinq constats transverses, via cerveau lire)
C:/Users/benja/Documents/presti/plans/011-cadrage-01-11/cadrage-p1.md (l.340-350)
C:/Users/benja/Documents/presti/plans/011-cadrage-01-11/cadrage-p3.md (l.385-391)
C:/Users/benja/Documents/presti/plans/011-cadrage-01-11/cadrage-p4.md (l.335-341)
C:/Users/benja/Documents/presti/.orchestre/orchestre.json (clés vault et carteVault)
C:/Users/benja/Documents/presti/scripts/orchestre.mjs (grep carteVault, CARTE_VAULT)
C:/Users/benja/Documents/presti/scripts/coentreprise.mjs (l.20-21)
C:/Users/benja/Documents/presti/scripts/hooks/contexte-fond.mjs (l.1-15)
C:/Users/benja/Documents/presti/.claude/settings.json (crochets)
C:/Users/benja/Documents/presti/scripts/savoir/lecons.mjs, vault-journal-qa.mjs, vault-journal-v18-qa.mjs, cibles-instagram-qa.mjs, usine.mjs, retractation-qa.mjs (grep SaaS)
C:/Users/benja/Documents/presti/.claude/workflows/post-du-jour.js, pub-10-sur-10.js, chasse-prospects.js, marketing-trio.js (grep SaaS)
C:/Users/benja/AppData/Local/hermes/config.yaml (grep, sans valeurs)
C:/Users/benja/AppData/Roaming/obsidian/obsidian.json (liste des coffres)
MCP cerveau : regles_pour (réorganiser l'arborescence du vault) → [] ; chercher (arborescence 10 Presti / 30 Prospection…) ; lire presti/plans/011-cadrage-01-11/cadrage-00-synthese.md
MCP scheduled-tasks : list_scheduled_tasks ; list_task_runs presti-rangement-vault-soir et presti-apprentissage-hebdo

# NON VERIFIE
Obsidian Sync : le plugin de base « sync » est actif dans core-plugins.json, mais aucun fichier de réglage ne le confirme dans .obsidian. Je n'ai pas pu vérifier que le coffre est relié à un coffre distant, ni donc si les données de prospects du vault partent vers les serveurs d'Obsidian.
Contenu des fichiers de données de prospects (Prospection/*.json, *.csv, *.txt, Lot-*, FB-10-…, corbeille-…, emails-artisans/, prospect-*) : volontairement non lu.
Les fils inbox/sessions peuvent contenir des noms de personnes ou d'entreprises en clair : le masquage de capture-session.mjs ne couvre que clés, JWT, e-mails et téléphones. Non audité.
Le lint claude-obsidian (claude-obsidian.py lint) n'a pas été lancé, faute de certitude qu'il n'écrit aucun cache. Le décompte de 64 liens morts, dont 0 dans wiki/, vient de mon propre script : il résout par nom de fichier et ignore les alias, donc il est approximatif.
La limite « écriture du cœur claude-obsidian refusée sous Windows natif (UNSUPPORTED_PLATFORM, WSL requis) » vient de la note wiki/concepts/Système neuronal du cerveau.md. Je ne l'ai pas rejouée.
L'injection réelle de wiki/hot.md par le crochet SessionStart de claude-obsidian est configurée (variables et python3 présents) mais n'a pas été observée dans une session.
Embeddings du cerveau : la recherche faite pendant l'inventaire est revenue en mode bm25. Je n'ai pas vérifié si Ollama et granite-embedding tournent (data/vecteurs.json date du 19/10).
L'origine des 75 fils inbox/sessions qui ne viennent pas du crochet est déduite des SKILL.md et des workflows (en-tête « Réseau neuronal d'abord », point 3). Je n'ai pas relu chaque exécution.
Le nom des fils du crochet combine la date UTC (toISOString, capture-session.mjs:49) et l'heure locale (toTimeString, l.50) : entre 0 h et 1 h (heure d'hiver), le préfixe de date pourrait être celui de la veille. Non observé. Le seul fil nommé à 00h48 ne permet pas de trancher, car le rangement du 29/10 a réécrit sa date de modification.
presti-apprentissage-hebdo n'a jamais tourné (premier passage prévu le 01/11 vers 20 h 06, heure de Paris) : son effet réel sur le vault est inconnu. On ne sait pas non plus si le rangement de ce soir (21 h 40) réussira après la remise à zéro de la limite hebdomadaire.
Hermes : aucun fichier yaml, md ou json ne cite le vault, et mcp_servers est commenté dans config.yaml (l.1635). Je n'ai pas vérifié dans le code Python, ni dans .env ou auth.json, volontairement non lus.
Orca : le crochet orca-agent-hook.exe est déclaré sur 15 événements de ~/.claude/settings.json. Je n'ai pas vérifié s'il lit ou écrit dans le vault.
Les chemins du vault cités dans des commentaires ou des fixtures du dépôt presti (scripts/fixtures/026…, lib/agents/acquisition/affirmations.ts, retractation-qa.mjs) n'ont pas été classés un à un entre lecture effective par le code et simple mention.
Je n'ai pas vérifié si des notes du wiki citent des chemins du vault dans leur propriété sources: : un déplacement d'anciennes notes pourrait les rendre obsolètes.