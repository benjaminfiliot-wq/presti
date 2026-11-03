## Ressources utilisées

Session : hôte d'agents Oracle, sans écran, modèle Sonnet 5.5, une suite lourde à la fois. Inventaire fait avant de produire : outil Skill, MCP `cerveau` (copie du vault du 02/11, lecture seule),
MCP `n8n-oracle` (**listé mais non utilisé** : ce lot ne crée ni ne modifie aucun workflow ; aucun identifiant n8n n'a été lu, créé ni modifié), sous-agents (non lancés : le travail
tenait dans les fichiers du périmètre). Les skills de design, de vidéo et de pages ne servent pas ce domaine et n'ont pas été chargés.

- **Skill `reseau-neuronal`** (consigne du dépôt) et **MCP `cerveau`** : `regles_pour` (« agents, n8n, Gmail, données client, envoi automatique, mise en service et mode ombre d'un compte volontaire »)
  a rendu `[]` : aucune règle propre au cerveau pour cette tâche ; les règles appliquées sont donc celles de `.claude/rules/*.md` lus en entier. Effet : rien n'a été écrit dans le vault ; la note de fin de chantier
  (règle n° 4 de « Écrire ici ») est laissée à la session principale, seule autorisée à écrire dans le vault.
- **Le prompt 6** (`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`) : § 1.6 (les neuf KPIs), § 1.7 (les tests obligatoires, p6:393-403), § 1.4 (les paliers simulation → ombre → Studio → Signature,
  p6:370), § 0.6. Effet : la table des douze tests de `p6-transverse-qa.mjs`, les neuf requêtes de `kpis-base.md`, la définition du mode ombre (« on compare à ce que l'artisan a réellement fait ») que j'avais d'abord écrite
  autrement (« comparé à l'ancien code ») et corrigée dans `mise-en-service.md` et `runbook.md`.
- **La première réponse** (`plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`) : § 3.3 (tableau Studio / Signature au fichier:ligne), § 4 (ligne 036-012 et ses critères de sortie), § 5 (les cinq décisions et leur défaut).
  Effet : l'ordre des étapes 1 à 12 de `mise-en-service.md` (décision 1 → clé et modules ; décision 2 → IMAP d'abord ; décisions 3, 4, 5 → ce qui reste fermé) ; `T5` pinne 10 minutes et 20 par jour sur `lib/pilote/regles.ts:27,30`.
- **`OUTILLAGE.md`** (O1 à O6) et les 19 gabarits `gabarit-*` (`.orchestre/preuves/036-013` à `036-018`) : base de `scripts/deployer-client-n8n.mjs`. Effet : la nomination `client-<slug>-*` / `client-ent-<slug>-*` (pour que
  la règle R23 de la garde commune reconnaisse l'Entreprise), les emplacements d'identifiants (O3 : aucun identifiant dans un gabarit, ceux du client branchés par lui), la désactivation des envois en Studio (O4).
- **`scripts/n8n-specs-qa.mjs`** (garde commune R1 à R23, lue en entier, non modifiée) : les copies produites passent R1 à R23 ; sa famille `client-` (`n8n-specs-qa.mjs:169`) existait déjà, anticipée par un lot précédent.
- **Les juges des lots 036-001 à 036-009, 036-013 à 036-018** (lecture seule) : cherchés ligne par ligne pour trouver le mutant qui porte chaque test du § 1.7 (`grep` des libellés de mutants) ; c'est ainsi que j'ai trouvé que
  `suivi-n8n-qa.mjs` (036-004) n'était **pas** au lanceur, et que la constante `PLAFOND_AUTO_JOUR` n'était pas pinnée par `pilote-qa.mjs` (A11 raisonne en `R.PLAFOND_AUTO_JOUR`).
- **Les vidéos déjà analysées** : `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` et `fiches-videos-restructureai.md` (lues pour le runbook et le mode ombre). Effet : « une exception arrive préparée : brouillon,
  montant calculé par le code » (fiches-videos-restructureai.md:41) est la forme de la carte comparée en ombre ; l'alerte d'un workflow en panne signalée et l'escalade humaine (fiches-videos.md § 5) fondent `runbook.md` § 3 (le
  département se tait, une alerte part, la reprise est à la main) ; `fiche-methode-n8n.md` point 2 (publier les enfants avant le parent) et point 8 (« Supabase account » passe outre la RLS) fondent l'étape 7 et le filtre de compte de chaque requête.
- **`.claude/rules/*.md`, `CLAUDE.md`, `.orchestre/contexte.md`** : `migration-production.md` (les cinq pas, le tableau de `migration-automatisations.md`), `securite.md` (tout est préparé, rien exécuté), `architecture-outils.md`,
  `autonomie-abonnements.md`, `email-brevo.md` (la prospection froide et les relances clients sont deux files distinctes : citée au runbook). **`lib/pilote/regles.ts`, `lib/plans.ts`, `lib/flags.ts`, les migrations `0174`, `0185`, `0192`, `0193`** : lues
  pour les noms exacts de tables, de colonnes, de paliers et de drapeaux ; jamais modifiées.

## Ce que ce lot a fait — et rien d'appliqué

| Livrable | Fichier | Statut |
|---|---|---|
| Lanceur : 3 juges inscrits (`suivi-n8n-qa`, `deployer-client-n8n-qa`, `p6-transverse-qa`) | `scripts/tout-verifier.mjs` (+7 lignes, juste avant la garde Orca) | fait ; **le lanceur n'a pas été lancé** (il fait un build) |
| Suite transverse du § 1.7 | `scripts/p6-transverse-qa.mjs` | 12 tests, 17 mutants rouges sur 17 ; `--vivant` : 9 juges porteurs rejoués |
| Déployeur de copies client, à blanc | `scripts/deployer-client-n8n.mjs` | jamais de réseau, jamais d'identifiant réel |
| Son juge | `scripts/deployer-client-n8n-qa.mjs` | 4 clients fictifs, 39 copies, 16 mutants rouges sur 16 |
| Runbook (couper, rejouer, reprendre) | `plans/011-cadrage-01-11/p6-signature/runbook.md` | écrit, rien exécuté |
| Mise en service pour Benj (12 étapes) | `…/mise-en-service.md` | écrit |
| Migration des automatisations codées, cinq pas | `…/migration-automatisations.md` | écrit : où en est chacune |
| Base de départ des KPIs (requêtes en lecture) | `…/kpis-base.md` | écrit, **aucune requête jouée** |
| Dossier du mode ombre | `…/mode-ombre.md` | écrit |

## Le lanceur : les juges inscrits

Relevé par la suite transverse elle-même (`p6-transverse-qa.mjs`, règle L1) : tout `scripts/*-n8n-qa.mjs`, `gabarits-*-qa.mjs`, `systeme-agents-schema-qa.mjs`, `connexions-qa.mjs`, `n8n-specs-qa.mjs`,
`deployer-client-n8n-qa.mjs` et `p6-transverse-qa.mjs` est dans `SUITES` ou `HORS_LANCEUR`. **Un seul manquait : `suivi-n8n-qa.mjs` (036-004), écrit et joué par personne**. Ajouté, sans doublon (règle L2).
Les juges des lots 036-001 à 036-009 et 036-013 à 036-018 étaient déjà inscrits (par Claude Code, comme le dit la tâche) : aucun n'a été ajouté en double.
**Mise à jour finale : 036-010 est passé dans `fait/` pendant le lot ; la suite transverse a rougi comme prévu, et `maquettes-p6-qa.mjs` est maintenant au lanceur (navigateur). `interface-p6-qa.mjs` (036-011) n existe pas encore ; la même règle l exigera.**
le premier : il appartient à un lot encore ouvert (il peut changer, il joue Chromium) et une inscription en double est le défaut que la tâche interdit. La suite transverse **rougit** dès que 036-010 ou 036-011 passe dans
`fait/` sans que son juge soit au lanceur (règle L1, deux mutants) : le contrôle est posé, la décision reste à la session principale.

## Les tests du § 1.7 et le juge qui porte chacun

| Test | Juge(s) | Le mutant qui le fait rougir |
|---|---|---|
| T1 le même événement rejoué deux fois | `cerveau-accueil-n8n-qa.mjs`, `boite-n8n-qa.mjs` | « le même événement rejoué deux fois donne deux cartes » · « un message importé deux fois » |
| T2a Studio : aucun envoi | `cerveau-accueil-n8n-qa.mjs`, `deployer-client-n8n-qa.mjs` | « Studio qui envoie » (les deux) |
| T2b brouillon créé, pas envoyé | `boite-n8n-qa.mjs` | « un brouillon envoyé en Studio » |
| T3 Signature : type non activé = carte | `cerveau-accueil-n8n-qa.mjs` | « Signature : un type non activé qui part » |
| T4 `OUTILS_JAMAIS_AUTO` = carte | `cerveau-accueil-n8n-qa.mjs` + **ici** | « un geste de OUTILS_JAMAIS_AUTO qui part (porte ôtée) » · liste vidée dans une copie de la racine : `pilote-qa` rougit |
| T5 10 min et 20 par jour | `pilote-qa.mjs` + **ici** | délai à 0 : `FAIL A12` · plafond à 2 000 : `pilote-qa` rougit · et la constante est **pinnée ici** (`pilote-qa` ne la pinne pas) |
| T6 prix sans source | `devis-facture-n8n-qa.mjs` | « un prix sans source présenté comme sourcé (la règle des prix ôtée) » |
| T7 créneau absent | `operations-n8n-qa.mjs` | « un créneau absent de l’agenda proposé » |
| T8 autorisation expirée | `boite-n8n-qa.mjs`, `connexions-qa.mjs` | « un jeton expiré qui fait planter » (les deux) · « traité comme une panne (ni état ni alerte) » |
| T9 deux comptes | `cerveau-accueil-n8n-qa.mjs` | « une requête sans filtre artisan_id » · « un événement d’un autre compte routé » |
| T10 avis négatif jamais publié | `apres-reputation-n8n-qa.mjs` | « un avis négatif publié » (deux mutants) |
| T11 STOP | `apres-reputation-n8n-qa.mjs` | « un STOP ignoré » |
| T12 empreintes des offres | `offres-affichage-qa.mjs` + **ici** | « mutation 9 non vue » · une capacité de plus à Studio dans une copie de la racine : le juge rougit |

## La sortie de la suite transverse et ses mutants (`transverse.log`, `transverse-vivant.log`)

- Défaut : `p6-transverse-qa : 17 mutants rouges sur 17 attendus (2 s)` puis `OK`. Dix mutants de la suite elle-même (marqueur ôté d'un juge, juge absent, juge sorti du lanceur, nouveau `*-n8n-qa.mjs` non joué, lot déclaré fait sans juge,
  suite en double, juge sans mutant, juge joué et écarté), quatre mutants rejoués sur une copie de la racine (délai 0, `OUTILS_JAMAIS_AUTO` vidée, plafond 2 000, Studio qui reçoit `plateforme.ia.auto`), deux épingles (délai et plafond lus dans `regles.ts`).
  La racine saine passe d'abord (sinon un rouge ne prouverait rien).
- `--vivant` (306 s) : joue en plus chaque juge porteur — `cerveau-accueil-n8n-qa` (19/19 mutants rouges, 112 s), `boite-n8n-qa`, `deployer-client-n8n-qa` (16/16), `pilote-qa`, `devis-facture-n8n-qa` (29/29), `operations-n8n-qa`,
  `connexions-qa`, `apres-reputation-n8n-qa`, `offres-affichage-qa` — tous code 0.

## Le déployeur à blanc et son juge (`deployer-juge.log`, `deployer-cli.log`)

Quatre clients fictifs (`atelier-studio-exemple` Studio, `bureau-signature-exemple` Signature avec `reponse_prospect` et `relance_devis`, `groupe-exemple` Entreprise, `menuiserie-studio-deux` Studio) : 39 copies (10 + 10 + 9 + 10).
Règles D0 à D10 tenues ; **16 mutants rouges sur 16**, dont les quatre que la tâche exige (identifiant réel écrit, deux clients mélangés, appel réseau, Studio qui envoie). Chaque copie passe `n8n-specs-qa.mjs` (R1 à R23) ; deux clients n'ont
aucun réglage commun (organisation, identifiants, noms, et pas une citation de l'autre dans les fichiers) ; une copie Studio désactive tout envoi (hors brouillon et lecture) ; rejoué, il donne les mêmes octets ; aucun identifiant n'est autre
qu'un emplacement `EMPLACEMENT_<CLIENT>_<type>` ; la copie est le gabarit à l'organisation et aux jetons donnés près (paramètres, notes, liaisons, réglages, codes, empreintes).

Constats sur les gabarits, relevés en construisant le déployeur (non corrigés : hors périmètre) :
1. Les gabarits n'ont **pas un mécanisme unique** pour poser le compte : `A_RENSEIGNER_A_LA_COPIE` (Accueil), l'UUID d'exemple `…0000000000e1` dans un nœud Code « Préparer » (Devis, Facturation, Suivi), `ORGANISATION_DU_CLIENT` (Entreprise), rien d'explicite pour Après-chantier, Opérations, Direction. Le déployeur remplace les trois jetons connus ; pour les trois gabarits sans jeton, la copie lit le compte en base (`organisation_id` dans la requête). À unifier un jour.
2. `facebookGraphApi` se règle par `httpRequestMethod`, non par `operation` : la liste « envoi » de la garde commune le range avec les envois même en GET. Le déployeur lit la méthode.
3. Les noms d'identifiants (`gmailOAuth2`, `slackOAuth2Api`…) sont les noms habituels de n8n, **non reconfirmés** à l'import réel (pas de MCP n8n sur l'hôte) : ce sont des emplacements, pas des promesses.
4. `scripts/accuse-bascule-qa.mjs`, cité par `lib/flags.ts:328`, est absent de cette copie du dépôt.

## L'ordre de mise en service pour Benj (résumé ; le détail est `mise-en-service.md`)

1. Trancher O3 (défaut recommandé : voie b) · 2. Webhook ou non (défaut : non) · 3. Essai à sec des trois migrations (session principale) · 4. Relire l'état des migrations en base · 5. Coller `0185`, `0192`, `0193`, dans cet ordre, contrôles du pied
au vert · 6. Lever `accuseParN8n`, `systemeAgents`, `connexions`, **après** · 7. Dans n8n : `BOITE_CLE_N8N`, modules des exécuteurs, **`callerIds` des sept `lib-*` du socle ouverts aux huit chefs** (aucun n'y figure sur les exports),
enfants avant parents · 8. Comptes volontaires, accord écrit · 9. Déployer la copie d'un client (`deployer-client-n8n.mjs`, puis import inactif et branchement des emplacements par Benj) · 10. Mode ombre, un département à la fois · 11a. Studio réel ·
11b. Signature type par type · 12. Premier envoi réel, d'abord vers soi.

## Ce qui n'a pas été fait, et pourquoi

- `suivi-n8n-qa.mjs` rejoué : 42 mutants, 42 rouges (`suivi.log`).
- **Le lanceur n'a pas été lancé** (build interdit) : j'ai joué à la main les juges concernés, un à la fois. `npx tsc --noEmit` non joué (aucun fichier TypeScript touché).
- **Aucune requête de `kpis-base.md` n'a été jouée** (pas de base sur l'hôte, accord requis) : la base de départ de chaque KPI reste à relever par la session principale ou Benj ; trois sont déjà dites « non mesurables avant 0185 / 0193 / l'API des avis ».
- **Pas 4 et 5 de la migration des automatisations** : ils touchent `app/**` et `lib/**`, la production et un déploiement.
- Aucune requête de `runbook.md` n'a été exécutée ; aucun workflow n8n touché ; aucun identifiant ; aucune migration ; aucun drapeau ; aucun secret ; rien dans le vault.
- Limites des requêtes KPI dites en tête de `kpis-base.md` : dates de devis non rattrapées avant 0170 (non appliquée), `payee_le` nulle avant 0140.
- Le mode ombre n'est pas recommandé tant que 036-011 (l'écran) n'est pas livré (`mode-ombre.md` § 7).

## À valider (points pour Benj)

1. Inscrire `maquettes-p6-qa.mjs` au lanceur quand 036-010 sera fait (la suite transverse l'exigera alors).
2. Les seuils de passage du mode ombre (7 jours, 20 événements, 80 %) sont des propositions non mesurées.
3. Le brouillon de Studio en ombre : règle prudente (« pas en ombre, seulement au réel ») à faire écrire et juger par un lot.
4. La voie O3 : b recommandée, a possible après essai OAuth2 sur un compte d'essai.
