## ADDENDUM — Contexte réel, décisions verrouillées (Benj, 01/11/2026)

### 1. Presti est en production, pas en prototype

- 53 pages, 224 routes API, 168 migrations, 2 crons Vercel, coque Capacitor.
- Automatisations existantes en code : pg_cron acq-*, tic de la minute,
  crons Vercel, Pilote automatique, relances.

Règle de migration :
- On remplace ces automatisations UNE PAR UNE dans n8n.
- Chaque remplacement : workflow n8n créé → testé en dry-run →
  comparé à l'ancien comportement → ancien code désactivé → drapeau vérifié.
- On ne rase rien en attendant. Chaque refactor est une suite de pas réversibles.

### 2. Agents — qui fait quoi (non négociable)

- Claude Code et Hermes Agent sont les SEULS agents qui font le travail.
- Pas d'Antigravity, pas de Codex, pas d'autres exécutants.
- Claude Code : développement, maintenance, tests, revue de code, verdicts.
- Hermes Agent : intelligence, compréhension des demandes, choix des outils,
  orchestration, préparation des tâches.
- Orca : harness obligatoire pour Hermes — sessions, permissions, mémoire, contrôle.
- n8n : moteur de TOUTES les automatisations, sans exception.

### 3. Infrastructure auto-hébergée sur Oracle (88.96.53.3)

Tout tourne en Docker sur le serveur Oracle, à côté de n8n :

- Firecrawl auto-hébergé (Docker) — remplace Firecrawl en ligne.
- Crawlee (Docker) — scraping de pages dynamiques.
- SearXNG (déjà installé) — recherche web méta.
- ScrapeGraphAI (Docker) — extraction structurée assistée par IA.

Outils payants ou interdits — ne pas utiliser :
- Firecrawl en ligne : à sec.
- Apify : clé invalide.
- Scrapin : jamais branché.
- LinkedIn : collecte interdite par ses conditions.
- WaveSpeed : payant, ne pas utiliser sans accord explicite.

### 4. E-mail en masse — décision verrouillée : Brevo gratuit

Option A retenue : Brevo plan gratuit.

- 300 e-mails/jour maximum, non cumulables d'un jour sur l'autre.
- 100 000 contacts stockés.
- Automatisations Brevo limitées à 2 000 contacts uniques.
- Intégration n8n native : node Brevo (contacts + envoi) + Brevo Trigger.
- Branding Brevo présent sur les e-mails.

Règles d'usage :
- La prospection e-mail automatique respecte le plafond de 300/jour.
- Le workflow n8n vérifie le quota restant avant chaque campagne.
- Si le plafond est atteint, la campagne est mise en file pour le lendemain,
  jamais bloquée ni perdue.
- Les relances de factures/devis clients sont dans un workflow n8n distinct
  de la prospection froide, pour ne pas consommer le même quota.
- Brevo Trigger capte les réponses, bounces et désabonnements
  et met à jour Supabase en temps réel.

Seuil de bascule :
- < 9 000 e-mails/mois : Brevo gratuit suffisant.
- > 9 000/mois ou > 2 000 contacts uniques en automatisation :
  basculer vers Listmonk auto-hébergé sur Oracle + SES,
  en remplaçant seulement le node Brevo par un node HTTP Request.

### 5. Autonomie — ce qui est automatique, ce qui ne l'est pas

TOUT est automatique par défaut :
- Prospection e-mail : automatique, sans validation de Benj.
- Devis, factures, relances, inventaire, réponses clients : automatiques
  selon les règles de l'abonnement.
- Carrousels : publication automatique après les 2-3 premiers validés.

SEULE EXCEPTION — Vidéos motion design ET carrousels :
- Les 2-3 PREMIÈRES vidéos motion design produites : validation de Benj obligatoire.
- Les 2-3 PREMIERS carrousels produits : validation de Benj obligatoire.
- Une fois ces 2-3 premiers validés par Benj :
  - le système considère le format comme validé,
  - les vidéos et carrousels suivants sont publiés automatiquement,
  - Benj peut toujours les consulter a posteriori,
  - aucune validation n'est plus requise sauf anomalie détectée par la QA.

Règle de passage en automatique :
- Après 2-3 validations positives consécutives sur un format donné,
  le système passe ce format en mode publication automatique.
- La QA automatique continue de tourner sur chaque contenu.
- Si la QA détecte une anomalie, le contenu repasse en validation humaine.

### 6. Méthode imposée par le dépôt

- Claude Code pense, Hermes Agent produit et orchestre.
- Claude Code n'écrit lui-même que : schéma/migrations, argent, sécurité,
  cerveaux (prompts), verdicts.
- Tout le reste va dans .orchestre/file/ comme tâche Markdown avec en-tête YAML.
- Lire .orchestre/contexte.md et le vault avant toute tâche, pas le dépôt entier.
- Vérification mécanique : node scripts/orchestre.mjs verifier <id>.
- Bloqué = question à options dans .orchestre/en-cours/<id>.question.md,
  jamais une discussion.

### 7. Règles de sécurité à respecter absolument

- Aucun secret versionné (garde-commit.mjs).
- Aucune donnée de prospect/client envoyée à un modèle gratuit en ligne.
- Comptes réseaux non Presti intouchables ; jamais de mot de passe, clé ou OAuth saisi.
- Migration : on colle PUIS on lève le drapeau, jamais l'inverse.
- Toute action irréversible attend l'accord de Benj,
  SAUF les exceptions écrites ci-dessus :
  - prospection e-mail automatique,
  - carrousels après 2-3 validations,
  - vidéos après 2-3 validations.

---

## CONSIGNE DE BENJ (01/11) SUR CLAUDE.md ET .claude/rules/

Lis le CLAUDE.md à la racine du projet.

Crée la structure suivante dans .claude/rules/ :
- architecture-outils.md
- autonomie-abonnements.md
- email-brevo.md
- migration-production.md
- securite.md

Chaque fichier reprend une section de l'addendum que je vais te coller ensuite.
Le CLAUDE.md racine doit devenir court (< 200 lignes) et renvoyer vers ces rules.

Affiche-moi la structure proposée avant de créer les fichiers.

---

## CONSIGNE DE BENJ (01/11) POUR LA PHASE 1.4 — DÉCISIONS À MIGRER DANS LE VAULT

Ces décisions, prises le 01/11/2026, doivent devenir des notes de décision
dans `10 Presti/04 Décisions/`, au format ADR :

1. **ADR-001 — Toutes les automatisations dans n8n**
   - Contexte : unifier l'exécution, éviter le code en dur.
   - Décision : toute automatisation vit dans n8n, jamais en dur dans le backend.
   - Alternatives rejetées : code natif, autres plateformes.

2. **ADR-002 — Hermes Agent systématique + Orca harness**
   - Contexte : besoin d'une couche d'intelligence persistante et contrôlée.
   - Décision : Hermes pour l'intelligence, Orca pour le harness.
   - Alternatives rejetées : Antigravity, Codex, autres exécutants.

3. **ADR-003 — Infrastructure auto-hébergée sur Oracle**
   - Contexte : contrainte « zéro outil payant ».
   - Décision : Firecrawl, Crawlee, SearXNG, ScrapeGraphAI en Docker sur Oracle.
   - Alternatives rejetées : Apify, Scrapin, LinkedIn, WaveSpeed (payants/interdits).

4. **ADR-004 — Brevo gratuit pour l'e-mail en masse**
   - Contexte : besoin d'envoi en masse sans coût.
   - Décision : Brevo gratuit, 300/jour, quota vérifié avant campagne.
   - Seuil de bascule : > 9 000/mois ou > 2 000 contacts → Listmonk auto-hébergé.
   - Alternatives rejetées : Listmonk (reporté), Apify, autres.

5. **ADR-005 — Prospection e-mail automatique**
   - Contexte : volume et efficacité.
   - Décision : prospection e-mail automatique, sans validation de Benj.
   - Garde-fous : plafond 300/jour, opt-out, exclusion, journalisation.

6. **ADR-006 — Vidéos et carrousels : validation initiale puis auto**
   - Contexte : qualité créative sans friction.
   - Décision : 2-3 premières vidéos ET carrousels validées par Benj,
     puis publication automatique du format.
   - Garde-fou : QA automatique continue, retour en validation si anomalie.

Chaque ADR doit avoir :
- un frontmatter (type: decision, date, status, project),
- un contexte,
- la décision,
- les alternatives rejetées,
- les conséquences,
- les sources/liens.

Ces ADR sont la source de vérité du « pourquoi ».
Le `CLAUDE.md` et les `.claude/rules/` ne gardent que le « quoi » court.
