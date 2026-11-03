# 035-011 — la conformité du kit Entreprise : preuve

Tâche 035-011, faite le 02/11/2026 par Claude Code sur l'hôte d'agents d'Oracle. Pièces dans
`plans/011-cadrage-01-11/p5-entreprise/kit/conformite/` : `sous-traitants.md`, `contrat-sous-traitance.md`, `question-licence-n8n.md`, et
`rapport.md` (audit de `presti-audit-conformite`, **VERDICT : CONFORME** à la quatrième passe).

## Ressources utilisées

- **Skill `reseau-neuronal`** : chargé en premier. Il a imposé l'ordre (`regles_pour`, puis `chercher`, puis `lire`), l'interdiction d'écrire dans le vault
  et la citation des notes par leur chemin. Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`** : `regles_pour` sur « RGPD, sous-traitance, Entreprise » (retour : liste vide, aucune règle propre à cette tâche) ; deux `chercher`
  (sous-traitants et DPA ; licence de n8n) ; `lire` de `vault/Legal/DPA-prestataires-2026-10-21.md`. Il a fourni le relevé du 21/10 des DPA (versions,
  dates, statut DPF, durées d'Anthropic, limite du DPA de Vercel aux offres Pro et Enterprise) : base de `sous-traitants.md`.
- **Agent `presti-audit-conformite`** (distinct de l'auteur) : quatre passes. Passe 1 : NON CONFORME, 8 écarts bloquants et 12 points non
  bloquants. Passe 2 : 2 bloquants. Passe 3 : 1 bloquant. Passe 4 : CONFORME. Il a trouvé ce que l'auteur n'avait pas vu (voir ci-dessous).
- **Sources du dossier lues** : `docs/registre-traitements.md` (§ 22 bis, 23, 23 bis, 24), `.claude/rules/securite.md`, `email-brevo.md`,
  `architecture-outils.md`, le prompt 5 et son addendum, `premiere-reponse.md` (ligne 035-011, question 3, Amendement B1), `fiches-depots.md`
  (fiche 3, FAQ de licence de n8n), `fiche-methode-n8n.md` (fiche 12), `lib/legalArtisan.ts:308-316`, `.github/workflows/sauvegarde.yml`,
  `scripts/sauvegarde.mjs`, le kit existant (`kit/README.md`, `registre-donnees.md`). Elles ont fixé la liste, les régions et les durées.
- **Non utilisés, faute de pertinence** : le MCP `n8n-oracle` (aucun workflow à créer ou à lire) ; les skills de design, de vidéo, `presti-audit-attaque`
  et `security-review` (aucun code, aucune page). Les vidéos analysées ne traitent pas de RGPD. Aucune page n'a été relue en ligne (pas de réseau sortant).

## Ce qui a été produit

| Pièce | Contenu |
|---|---|
| `sous-traitants.md` | 6 permanents (Supabase, Vercel, Anthropic, Resend, Oracle, GitHub), 7 conditionnels (SMS, Telegram, Firebase, Web Push, Meta, Slack, Discord), ce qui n'en est pas un (n8n, n8n cloud, modèles gratuits, Brevo, Stripe…), l'accès de Hermes et de Claude Code. Chaque ligne : ce qu'il traite, où, garantie, page publique, état ; « à vérifier » sinon |
| `contrat-sous-traitance.md` | 15 articles + article 3 bis + 4 annexes : art. 28.3 a à h, 28.2, 28.4, 28.9, 30.2, 33.2, chapitre V ; bandeau « à faire relire par un juriste » ; blancs en « Exemple. » ; annexe 3 avec colonne « État » (en place / exigée, à prouver) ; points posés au juriste |
| `question-licence-n8n.md` | Brouillon en anglais à license@n8n.io (**non envoyé**, Benj l'envoie) : architecture, 5 questions de licence, 1 question sur la télémétrie et l'enregistrement ; ce que Benj fait de chaque réponse |

## Ce que l'audit a fait corriger (le défaut était dans ce que l'auteur croyait vrai)

- **GitHub** : l'auteur avait écrit « l'archive est chiffrée, donc GitHub ne la lit pas ». Faux : l'exécuteur GitHub reçoit la clé de service et lit les tables en
  clair avant de chiffrer (`sauvegarde.yml:36-39`) ; quatre workflows posent la clé, dont `generer-site.yml:46-47`.
- **Telegram** se contredisait entre la liste et l'article 7.4 ; **art. 28.3, premier alinéa** (obligations du responsable) manquait : article 3 bis ajouté.
- **Annexe 3** présentait comme établies des mesures que le prompt 5 exige seulement (isolation, porte de conformité, plafonds) ; la sauvegarde y était « en place »
  alors qu'elle échoue depuis le 25/10 ; la « traçabilité » citait une source qui prouvait autre chose.
- **Sous-traitants oubliés** : notifications push (Firebase, Web Push), canaux Meta, Discord ; **Hermes** « sans accès » était faux
  (`architecture-outils.md:81-86`).
- **Message à n8n** : sous-estimait la FAQ (elle interdit au client de *régler* un workflow, pas seulement d'en construire) et présentait le
  branchement OAuth comme réglé.

## Ce qui reste (dit dans `rapport.md`, section « Reste à Benj ou au juriste »)

- **Juriste** : relire tout contre le texte officiel de l'art. 28 (le texte n'a pas été relu en ligne) ; autorisation spécifique ou générale ; articles 14 et 15.2 ;
  les cinq points posés au juriste. **Rien n'est validé.**
- **Benj** : l'offre Vercel (Hobby = aucun DPA) ; le DPA d'Oracle à archiver ; la version exécutée du DPA de Resend ; le sort de la clé de service dans GitHub ;
  les conditions d'Anthropic pour Claude Code ; Firebase ; le fournisseur de SMS ; 7 ou 14 jours pour les exécutions en échec ; relire la FAQ de n8n à la source
  puis **envoyer lui-même** la question.
- **Hors périmètre, à reprendre par une autre tâche** : `kit/registre-donnees.md:11` et `:39` disent encore « n8n ne garde pas » les données, alors que les
  exécutions en échec sont gardées (14 jours) et que les identifiants du client y sont rangés. La section n8n du registre des traitements reste au lot L12.
- **Fichier touché hors périmètre, par le protocole de l'agent** : `.claude/agents/knowledge/audit.journal.md` (quatre entrées datées, exigées par
  `.claude/agents/knowledge/PROTOCOLE.md`). À garder ou à écarter par la session principale.

## Ce qui n'a pas été fait

- Aucun envoi (le brouillon reste un fichier), aucune écriture dans le vault ou le cerveau, aucun commit, push, build, migration, secret, ni workflow n8n.
- Aucune page de prestataire relue en ligne : tous les relevés ont au moins onze jours (21/10) ou viennent du dépôt.
- Les numéros de ligne de `rapport.md` visent les versions finales des trois pièces.
