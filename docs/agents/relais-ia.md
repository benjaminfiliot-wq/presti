# Le relais d'IA des agents

> Écrit le 5 octobre 2026, sur l'ordre de Benj : « l'équipe doit tourner via la totalité des IA ». Code : `lib/agents/relais.ts`
> (les agents), `scripts/usine/relais-chef.mjs` + `scripts/usine/chef-modele.mjs` (le chef). Juge : `node scripts/relais-ia-qa.mjs`
> (RI-1 à RI-15, RC-1 à RC-7, 17 sabotages sur copie). Essai réel sur l'usine : `scripts/agents/relais-essai.mjs`.

## L'ordre

| Nature de la donnée | Ordre des moteurs |
|---|---|
| **publique** (Studio, Douleurs, le chef sans donnée de prospect) | Codex (abonnement) → freellmapi `auto` → Ollama Cloud → Ollama local 8B → 4B |
| **prospect** (Standard, Facteur, Rédacteur, Veille pubs ; ou une entrée du chef qui porte une adresse, un téléphone ou un SIREN) | Codex (abonnement) → Ollama **local** seulement, et seulement après le « oui » daté de Benj |

Précisions : Douleurs commence par freellmapi (réserve de Codex). Une tâche simple prend le 4B d'abord (il reste chaud en mémoire :
changer de modèle coûte ~2 min de chargement sur l'usine), une tâche difficile (rédaction, texte vendu) prend le 8B d'abord.
Le chef, lui, passe par la file `chef-modele` (Codex lit et écrit des fichiers). Quand Codex est à bout, la MÊME demande est rejouée en **appel direct** (pas de boucle
d'outils : essai réel du 05/10, la boucle d'outils de Codex sur un modèle libre sortait en prose, en boucle ou à 30 000 jetons par essai, et ne tenait pas sur les 4 cœurs
de l'usine avec un modèle local) : les fichiers que la consigne cite (mode d'emploi, schéma, entrée du cycle) sont recopiés dans la requête et le JSON rendu est écrit à la place du
fichier de sortie. Ordre : freellmapi `gemini-3-flash-preview` → `ministral-14b` → `auto` (le routeur, deux essais) → Ollama Cloud → local 8B → 4B (contexte de 16 384 jetons, sans réflexion,
JSON forcé). Le plan du cycle est vérifié par le validateur du chef lui-même (`validerPlan`, scripts/chef/commun.mjs) AVANT d'être écrit : refusé, le modèle reçoit la liste des écarts
(jamais une valeur) et corrige (deux corrections au plus) — sans quoi le cycle refuserait le plan en bloc. La date du jour lui est donnée. Un moteur qui répond sans JSON n'est
pas un succès : le suivant prend la demande. Les moteurs libres sont limités par minute : quand tous sont à bout par un quota et
que la reprise de l'un arrive en moins de 5,5 minutes (et laisse au moins 4,5 minutes), le relais **attend** cette reprise et refait un tour (deux attentes au plus) avant le local.
Le cycle fixe le temps de la file (`--delai`) pour que le relais finisse avant que le cycle ne s'arrête. Le moteur de secours est dit dans l'événement `cycle_termine`
(« Moteur de secours : … »).

## La réunion d'équipage (18 h) : mêmes aides que le cycle

Écrit le 5 octobre 2026. La réunion (`scripts/chef/reunion.mjs`) demande son compte rendu `reunion.json` à `presti-chef-modele`, donc au même relais
que le cycle. Constat du jour : un modèle libre écrivait un compte rendu REFUSÉ en bloc par le schéma (ligne de 163 signes, libellés d'option de 114
signes, mesure hors liste, échéance à +7 j 2 h : 19 écarts) puis la réunion était abandonnée (`plan_refuse`). Depuis, pour la réunion aussi
(`scripts/chef/reunion-controle.mjs`, branché par `chef-modele.mjs` quand le fichier de sortie s'appelle `reunion.json`) :

1. **Les limites exactes et un exemple de JSON valide** sont dits au modèle (bloc « LIMITES EXACTES », avec la date du jour de Paris et l'heure de
   l'échéance permise) ; le texte de l'exemple est fictif et le recopier est refusé.
2. **Le validateur rend les écarts au modèle** (`validerReunion`, miroir des contrôles de `reunion.mjs` : un chemin et une raison, jamais une valeur),
   trois essais au plus par moteur, avant que le plan ne soit écrit.
3. **En dernier recours, une réduction déterministe sûre** (`reduireReunion`), seulement après le troisième refus : une ligne trop longue coupée à
   140 signes sur une limite de mot avec « … » (jamais plus du double, jamais au milieu d'un mot) ; un objectif non conforme → `null` (il ne change pas) ;
   les idées au-delà de la troisième retirées. Le résultat est revalidé, doit garder un sens (une vraie phrase, aucune ligne en double, aucun gabarit),
   et le relais le dit : « compte rendu raccourci par le relais » dans son journal (`note`) et dans le journal de la réunion
   (`reunion-AAAA-MM-JJ.log`, ligne `modele … moteur de secours …`). Tout le reste (vide, absurde, adresse, secret, clé fautive, libellé d'option
   trop long, échéance hors plage) reste abandonné : on ne coupe jamais ce qu'on ne peut pas couper sans changer le sens.
4. Le fichier de sortie de la réunion est le `-o` lui-même : le relais vérifie qu'il est écrit et non vide (un moteur libre qui répond en prose ne passe
   plus pour un succès, le suivant prend la demande) ; `reunion.mjs` donne au relais son temps moins 45 s (`--delai=`).

Juge : `relais-ia-qa` RC-11 (module, réduction, appelDirect), RC-12 (`chef-modele.mjs servir` de bout en bout avec une demande de réunion), RC-13
(journal du relais, `--delai` et journal de la réunion). Le compte rendu refusé du 05/10 sert de pièce (`scripts/fixtures/relais-ia/reunion-refusee-0510.json`).

## Les règles (non négociables)

1. **Une donnée de prospect ne part jamais vers une IA gratuite ni un modèle `:cloud`.** Trois verrous : la chaîne `CHAINE.prospect`,
   la disponibilité (`moteurPermis`), la garde posée au moment de l'appel. La nature ne se baisse jamais (un agent de prospects reste
   de prospects ; un appel peut seulement la relever : `lecteur(systeme, donnees, { nature: 'prospect' })`). La file des agents
   (`/srv/presti-ia/echange`) n'a **aucun** secours : seul `chef-modele.mjs servir` sur la file du chef en a.
2. **Le « oui » daté de Benj** (`IA_LOCALE_PROSPECTS_OUI=AAAA-MM-JJ`) reste la condition du local pour un prospect. Il n'est posé nulle part
   à ce jour : tant qu'il ne l'est pas, le Standard et le Rédacteur attendent Codex (rien n'est perdu : la tâche est reprise au passage
   suivant). Pour le poser : une ligne `Environment=IA_LOCALE_PROSPECTS_OUI=AAAA-MM-JJ` dans l'unité (`presti-standard`, …), copiée de
   sa ligne datée. `avec-coffre.mjs` laisse passer la variable.
3. **Le Facteur ne se replie pas** : son second juge est étalonné sur `codex:gpt-6-luna` seul (`secondJuge.ts`) ; un autre modèle serait
   refusé. Sans Codex, il ne juge pas, donc rien ne part (c'est voulu).
4. Coût : tous les moteurs valent 0 € (`COUT_VOIE_EUROS` + Ollama Cloud, compte gratuit) ; le plafond de 0 € est contrôlé AVANT chaque
   tentative, le coût est inscrit après (moteur, modèle, issue, raison de la bascule). Les garde-pause, l'opposition STOP et les drapeaux
   (`envoi_froid`…) ne sont pas touchés : le relais ne fait que choisir un modèle, il n'envoie rien.
5. Jamais un secret dans une trace, un argv ou une réponse. La clé de freellmapi (`FL_KEY`) vient de l'environnement ou du fichier
   `~/.config/presti/freellmapi.key` du compte qui la possède ; un service de prospects ne la reçoit jamais.

## Ce qui déclenche une bascule

429, « usage limit » (y compris sur la **sortie** du lanceur de la file IA, qui rend la sortie de Codex sur la sortie standard), 401, 402,
403, connexion refusée, délai, sortie non JSON. Le moteur est alors mis de côté pour une durée, **mémorisée** dans
`~/travail/relais/etat-moteurs.json` (le chef : `~chef-modele/.relais/etat-chef.json`) : chaque passage d'agent est un nouveau
processus. Codex : jusqu'à l'échéance annoncée, au plus 6 h ; Ollama Cloud : 6 h ; freellmapi : l'échéance annoncée (1 min à 1 h) ou
5 min ; local : 2 min ; accès refusé (401…) : 1 h. Une sortie non JSON ne met rien de côté.
La trace (une ligne JSON par tentative, sans donnée) : `~/travail/relais/relais-AAAA-MM-JJ.jsonl` ; l'état vu d'un coup d'œil :
`lireEtatRelais()`.

## Le retour de Codex (9 octobre, 21 h 15)

Rien à faire. Codex est toujours le premier de la chaîne : dès que sa mise de côté expire (au plus 6 h), le relais le sonde ; une
réponse réussie efface son état, et il reprend tout. Le chef de même. Si Codex n'est pas reconnecté (401 « non connecté », fichier
`auth.json` absent du compte `chef-modele`), il reste à bout et les secours continuent de servir.

## Ajouter un moteur

1. `lib/agents/relais.ts` : l'id dans `IdMoteur`, sa place dans `CHAINE.publique` (et `CHAINE.prospect` **seulement** si c'est la machine de
   l'usine ou l'abonnement de Benj), son modèle dans `modeleDe`, sa disponibilité dans `disponible`, son appel dans `essayer`,
   sa règle de mise de côté dans `echeanceDeMiseDeCote`, son coût (0 €) dans `COUT_RELAIS`.
2. Si c'est un moteur gratuit : ne **pas** l'ajouter à `MOTEURS_PROSPECT`. Pour le chef : `CHAINE_SECOURS` dans `relais-chef.mjs`.
3. `scripts/relais-ia-qa.mjs` : un cas qui l'exerce et un sabotage qui le rend rouge ; `scripts/agents/relais-essai.mjs` : sa sonde.

## Mise en service sur l'usine (gestes du gardien)

- Code : `node scripts/usine-agents.mjs maj` (avance `/srv/presti-agents` sur `origin/main`, par `ubuntu`).
- Le chef sur freellmapi : la clé de freellmapi dans le compte `chef-modele` (`/home/chef-modele/.config/presti/freellmapi.key`, 600) ;
  `~chef-modele/.codex/config.toml` porte déjà le fournisseur `ollama-usine`. Sans clé, le relais saute freellmapi et passe à Ollama.
- Freellmapi pour un service public des agents (Studio, Douleurs) : seulement si Benj l'accepte (une clé de plus dans le coffre).
  Sans elle, ces agents passent de Codex à Ollama Cloud puis au local.
