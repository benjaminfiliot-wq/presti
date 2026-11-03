# Audit de conformité RGPD — tâche 035-011 (`kit/conformite/`), quatrième relecture

VERDICT : CONFORME

Auditeur : `presti-audit-conformite`, sous-agent distinct de l'auteur, le 02/11/2026 (quatrième et dernière relecture, après correction de T1 et
de U1 à U3), en lecture seule : aucun réseau sortant, aucun fichier modifié hors ce rapport et le journal de l'agent. Pièces relues :
`sous-traitants.md` (106 l.), `contrat-sous-traitance.md` (294 l.), `question-licence-n8n.md` (121 l.). Les numéros de ligne sont ceux des
versions actuelles.

Portée du verdict. « Conforme » veut dire ceci : les trois pièces ne contiennent plus aucun écart bloquant au sens de cet audit. Plus aucun fait
faux. Aucune clause de l'art. 28.3 manquante. Aucune ligne présentée comme établie sans pièce qui l'établisse. Aucune garantie dite signée.
Aucun prix. Ce n'est **ni un avis juridique, ni une validation du contrat** : les pièces restent des brouillons « à faire relire par un juriste »
(`contrat:3-5`, `sous-traitants:3-5`). Leurs lignes « à vérifier » ne se signent pas en l'état (`sous-traitants:93-94`, `contrat:247-248`).

Contrôles mécaniques sur les trois pièces : 0 prix, montant ou pourcentage ; une seule adresse e-mail, `license@n8n.io` (`question:1`, `:41`) ;
aucune IP hors `127.0.0.1` ; aucune garantie ni accord dit signé.

## 1. Tableau

| # | Point vérifié | État | Où (versions actuelles) | Source confrontée |
|---|---|---|---|---|
| T1a | Traçabilité du pilote : file et journal, idempotence ; « pas pour les workflows d'un client » | CONFORME | `contrat:265` | `supabase/migrations/0174_pilote_automatique.sql:10-13` (« la FILE du pilote, et son JOURNAL » ; statuts ; « IDEMPOTENCE : unique (artisan_id, cle) ») |
| T1b | Traçabilité de l'assistant : journal des appels d'outils, cartes et actions préparées | CONFORME | `contrat:266` | `docs/registre-traitements.md:271` (§ 20 : « journal des appels d'outils (entrées résumées, résultat) ; cartes et actions préparées ») |
| T1c | Mode à blanc de l'adaptateur SMS | CONFORME | `contrat:267` | `lib/sms/envoyer.ts:1` (« À BLANC par défaut »), `:13` (« `mode: 'blanc'` (le défaut) ne sort JAMAIS ») |
| T1d | Workflows d'un client : « Exigée, à prouver » | CONFORME (renvoi indirect) | `contrat:268` | `p5:408-412`, dont `:409` rend `CLAUDE.md` applicable en entier ; les trois mesures sont nommées à `CLAUDE.md:74-75` — point V1 |
| U1 | Renvoi de la question 7 | CONFORME à la ligne ; libellé encore imprécis | `question:22-23` | `fiche-methode-n8n.md:1030`, `:1046-1047` — point V2 |
| U2 | Variante en libre-service = décision de sécurité de Benj | CONFORME | `question:24-25` | p5:117 (« Exposer un webhook n8n sur Internet … est une décision de sécurité de Benj ») |
| U3 | GitHub : « sauvegarde prévue au dépôt (en échec depuis le 25/10) » | CONFORME | `sous-traitants:40` | `chantier-4-assistant-plan.md:392` ; cohérent avec `contrat:263` |
| X1 | Contradictions entre les trois pièces (annexe 2 contre liste ; Telegram ; durées ; sens des délais ; sauvegarde) | aucune | `contrat:245-248` contre `sous-traitants:24-55` ; `contrat:116-118` et `:282-283` contre `sous-traitants:88-90` ; `contrat:262-263` contre `sous-traitants:39-40` | — |
| X2 | Annexe 3 : séparation « en place / exigée » tenue sur toutes les lignes | CONFORME | `contrat:252-271` | règle de l'annexe, `contrat:252-253` |
| X3 | Corrections des passes précédentes toujours en place (R1, R2, S1 à S9) | CONFORME | `contrat:282-283` ; `question:61-63`, `:81-83` ; `sous-traitants:29`, `:39-40`, `:50`, `:53`, `:76-77`, `:96` ; `question:9-10`, `:66` | sources des rapports précédents |
| C | Prix, adresses, IP, signatures, « Exemple. » | CONFORME | contrôle `grep` sur les trois pièces | consigne |

## 2. Écarts bloquants restants

Aucun.

## 3. Points non bloquants restants

- V1. `contrat:268` source l'exigence « chaque action d'un agent est journalisée ; idempotence ; mode à blanc avant la production » par
  `p5:408-412`. Ces lignes ne nomment pas les trois mesures : elles rendent `CLAUDE.md` applicable en entier (`p5:409`), et c'est `CLAUDE.md:74-75`
  qui les nomme. La ligne est une exigence, pas une preuve : le renvoi indirect suffit. Ajouter `CLAUDE.md:74-75` le rendrait direct.
- V2. `question:22` écrit « question 7 du § 5 de la fiche 12 ». Le § 5 (« Les questions ouvertes », `fiche-methode-n8n.md:1030`) est une section
  du fichier, sœur de la section qui contient la fiche 12 (`:86`, `:689`), pas une partie de la fiche 12. Le numéro de ligne cité
  (`:1046-1047`) est juste. Écrire « question 7 du § 5 de `fiche-methode-n8n.md` ».

## 4. Historique

- Premier audit : non conforme, 8 écarts bloquants. Ils portaient sur la sauvegarde GitHub, Telegram, l'art. 28.3 (droits et obligations du
  responsable), l'annexe 3, Vercel, Hermes, le push, la licence de n8n. Les sept premiers ont été corrigés à la seconde passe, le huitième
  en partie.
- Seconde passe : non conforme, 2 écarts bloquants. R1 était introduit par la correction (sens des délais inversé), R2 restait de l'écart 8
  (chemin de branchement des comptes). S'y ajoutaient 9 points S1 à S9. Les deux écarts et les 9 points ont été corrigés à la troisième passe,
  sauf S6 (traçabilité) et, en partie, S8.
- Troisième passe : non conforme, 1 écart bloquant. T1 : la ligne « Traçabilité » était « En place » sur une source qui prouvait autre chose
  (registre § 5, journal des actions du fondateur). S'y ajoutaient U1 à U3.
- Quatrième passe (ce rapport) : T1 corrigé (`contrat:265-268`, quatre lignes avec chacune sa vraie preuve, ou « Exigée ») ; U2 et U3 corrigés ;
  U1 presque (V2) ; aucun écart introduit. Restent V1 et V2, non bloquants.

## 5. Reste à Benj ou au juriste

- Auteur, s'il le veut : V1 et V2 (deux renvois à préciser).
- Hors périmètre de l'auteur, sans compter comme écart des pièces auditées : `kit/registre-donnees.md:11` et `:39` disent encore que n8n « ne
  garde pas » les données. Les trois pièces disent le contraire, avec leur source (échecs gardés 14 jours, identifiants dans n8n :
  `registre:350`, `registre-donnees.md:32`). À aligner par la tâche qui porte ce fichier.
- Juriste : relire le contrat contre le texte officiel de l'art. 28 (écrit « de mémoire », `contrat:11-12`). Choisir l'autorisation spécifique
  ou générale (`contrat:109-111`). Fixer les délais (6.1, 7.3, 9.2, 11.1, 12.2) dans le sens du point 4 (`contrat:282-283`). Rédiger les
  articles 14 et 15.2. Trancher les points 1 à 5 (`contrat:278-284`) : primauté, art. 22, art. 9, chaîne de sous-traitance, qualification de
  Telegram, des services de Web Push, de GitHub et des agents de construction.
- Benj :
  - vérifier l'offre Vercel (Hobby : aucun DPA et usage commercial interdit, `DPA-prestataires:44-46`, `:51`) ;
  - archiver le DPA d'Oracle et lire l'offre du compte (`registre:355`) ;
  - récupérer la version exécutée du DPA de Resend ;
  - décider du sort de la clé de service dans GitHub (quatre workflows, `sous-traitants:40`) et de la voie de sauvegarde ;
  - dire sous quelles conditions d'Anthropic tourne Claude Code (`sous-traitants:78-79`) ;
  - relever la région et le DPA de Firebase ;
  - trancher 7 ou 14 jours pour les exécutions en échec et poser `EXECUTIONS_DATA_MAX_AGE` ;
  - choisir le fournisseur de SMS ;
  - relire la FAQ de n8n à la source, copier les mots exacts (`question:75`), puis envoyer lui-même le message.
- Avant toute signature : prouver chaque ligne « Exigée, à prouver » de l'annexe 3 (`contrat:257`, `:260`, `:264`, `:268`, `:269`), et lever ou
  retirer chaque ligne « à vérifier » de la liste.
