# 031-016 — défauts C, D, A, F, B, G, H et I de l'audit adverse 031-012 corrigés

Exécutant : claude-code, 02/11/2026. Réseau neuronal d'abord : `regles_pour` (« file n8n, Hermes, Orca, relances d'agents… »)
rend la règle n8n-first (`presti/CLAUDE.md`, `.claude/rules/architecture-outils.md`) : la panne part donc PAR n8n (webhook
authentifié par le jeton de la file, ligne Slack #presti-auto, identifiant existant « Slack account 2 »), jamais par un envoi
codé dans le client. Aucun identifiant n8n créé ni modifié ; ni `--prendre` ni `--fini` sur la vraie file ; ni `orca agent
launch` ; `~/.presti` jamais ouvert (le banc relève noms, tailles et dates avant et après) ; jeton jamais lu ni affiché.

Preuves brutes, toutes dans ce dossier : `banc.txt` (banc complet), `garde-config-hermes.txt` (banc de la garde),
`mutants.txt` (tous les mutants du banc), `mutants-g.txt` (mutants de la garde), `n8n.txt` (workflow publié, essai 401 en
direct), `verifier.log` (sortie de `orchestre.mjs verifier 031-016`).

## Résultats mesurés

- Banc : `OK : 48 scénarios verts` (41 d'avant, S12 compris, et S14, S14b, S15 à S19), `~/.presti : inchangé` (`banc.txt`).
- Mutants du banc : 63 tués au premier passage complet ; 3 restaient. Aucun n'était une faiblesse : M1 et M32 ne trouvaient
  plus leur texte (condition D réécrite ; ligne 409 en double), M46 était couvert deux fois (la réservation refuse aussi
  `codex`). Ils ont été recentrés (M1 sur la nouvelle condition, `signalerPanne` écrit autrement, S13f attend le message exact),
  puis rejoués avec les mutants de la panne : `OK : tous les mutants sont tués` (`mutants.txt`). Deux mutants que mes propres
  contrôles F cachaient (M16, M22 : garde de l'id) ont fait préciser la garde F à la tâche rendue (`lien`) : tués.
- Garde de config : 44 vérifications vertes, 0 rouge, configuration réelle de Hermes conforme (`garde-config-hermes.txt`) ;
  mutants G1 et G2 tués (`mutants-g.txt`).
- `node scripts/orchestre.mjs verifier 031-016` : `✓ 031-016 : PASS` en en-cours, puis de nouveau `PASS` une fois la tâche
  dans `fait/` (digest : `| 031-016 | feature | fait | claude-code | PASS |`).
- Pendant un passage des mutants, le banc a vu `~/.presti/file-n8n-etat.json` changer : c'était le vrai precheck horaire
  d'Orca (date rafraîchie à une heure pile de la précédente), pas le banc. Les passages qui font foi ont été joués hors de
  cette fenêtre et disent `inchangé`.

## Défaut par défaut

| Défaut | Correctif (fichier) | Scénario rejoué sur le banc | Mutant qui rougit |
|---|---|---|---|
| **C** (élevé) relances sans borne d'un agent qui ne prend pas | Registre du répartiteur `~/.presti/lancements-taches.json` : +1 par réservation (precheck `--reserver`, sous le verrou), remis à 0 par la prise. À `LANCEMENTS_MAX = 2` sans prise : webhook `hermes-tache-panne` (ligne `bloque`, Slack), alerte locale, fichier de reprise effacé, et la file passe à la tâche suivante. Chaque relance ferme d'abord l'onglet du lancement précédent de la même tâche (`tache` noté dans la réservation) : un seul agent par tâche à la fois. Un webhook panne refusé (404, 400) est une PANNE du precheck (code 2) : rien n'est relancé. (`scripts/hermes-tache-n8n.mjs` : `LANCEMENTS_MAX`, `lancable`, `noterLancement`, `noterPrise`, `signalerPanne`) | **S14** : `revoir-notes` jamais prise, 5 passages horaires → 2 lancements de Claude Code (7 sur le code d'avant, `contre-banc.txt`), jamais plus d'un onglet ouvert, ligne 1 `bloque` « panne : 2 lancements sans prise… », un seul appel panne pour elle, ligne Slack « ⚠️ Panne de la file — Claude Code : revoir-notes (tâche 1) bloquée », puis Hermes lancé pour `essai-boucle` | M51 (borne à 99), M52 (onglet précédent non fermé), M53 (lancement non compté), M54 (panne non posée par n8n) → S14 ; M55 (la prise ne remet plus à zéro) → S2 |
| **I** échecs de lancement sans trace | `echec()` du répartiteur : chaque échec (precheck inattendu, exécutant inconnu, `orca agent launch`, onglet non rattaché) appelle `noterAlerte` et met `file-n8n-etat.json` à `panne`. Le lancement manqué compte déjà pour sa tâche : au deuxième, le precheck suivant la met en panne par le même webhook (`scripts/lancer-hermes-file.mjs`) | **S14b** : orca refuse chaque lancement → 2 « ÉCHEC DU LANCEMENT (tâche 1) » dans `alertes-file.log`, état `panne`, puis ligne `bloque` par le webhook panne et ligne Slack « Hermes : essai-boucle » ; plus aucune relance | M56 (alerte retirée), M57 (état laissé à `tache`) → S14b |
| **D** `--prendre` sans `--passage` rend la tâche d'un autre | `prendre` : une tâche portée par un passage connu n'est rendue qu'à lui, appel sans passage compris (`FILE OCCUPEE`). `.hermes.md` (boucle de tâche, point 1) et `methodeSupplement` d'`.orchestre/orchestre.json` enseignent `--prendre --passage=<passage de sa consigne>` | **S15** : Hermes du répartiteur prend la revue ; 10 min plus tard `--prendre` sans passage → `FILE OCCUPEE` code 1 (« TACHE 1 » avant) ; une tâche libre reste ouverte à un Hermes ouvert à la main ; la doc et le bloc Méthode disent `--passage=` | M58 (ancienne condition `passage && …`) → S15 |
| **A** exécutant déclaratif | `executantReserve` : l'exécutant vient de la réservation du passage (`onglets-hermes.json`, lue sous le verrou) ; passage non réservé → `REFUS` ; `--executant` contraire à la réservation → `REFUS` ; sans passage, `hermes` seulement. Commentaire : « serrure de bonne foi sur un même compte », plus « interdit mécaniquement » (client, brief `revoir-notes.md`) | **S16** : A1 `AUTRE EXECUTANT` ; A2 le même Hermes se dit `claude` → `REFUS` (« TACHE 1 » avant) ; A3 sans passage `--executant=claude` → `REFUS` ; passage jamais réservé → `REFUS` ; 0 prise ; puis le passage réservé à Claude Code prend la tâche SANS `--executant`. S13d adapté : le passage de Claude Code avec `--executant=hermes` → `REFUS` | M59 (exécutant tiré de `--executant`), M60 (passage non réservé pris pour Hermes) → S16 ; M65 (commentaire « interdit mécaniquement » remis) → S12 |
| **F** vérificateur de la revue au choix de l'agent | `--fini <id>` sans `--bloque` sur `revue-reseau-neuronal` lance lui-même `scripts/verifier-revue-reseau-neuronal.mjs .orchestre/preuves/revue-<jour de la prise, heure de Paris>` (ou du jour) et refuse « fait » si le code n'est pas 0 ; verdict revu sous le verrou. Au banc seulement, `PRESTI_VERIFICATEUR_REVUE` le remplace par un faux | **S17** : vérificateur à 1 → `REFUS : « fait » refusé pour la revue 1`, ligne `en_cours`, fichier de reprise gardé, vérificateur lancé une fois sur `.orchestre/preuves/revue-<date>` ; à 0 → rendue `fait` ; `--bloque` passe sans le lancer | M61 (vérificateur jamais lancé), M62 (verdict ignoré) → S17 |
| **B** `--forcer` ouvert à tous | **Retiré** de `--fini`, et chaque usage refusé ET noté (`--FORCER REFUSÉ` dans `alertes-file.log`). Choix : une note n'aurait rien empêché (n'importe quel appelant l'ajoute, et personne ne lisait ce fichier, défaut I) ; le seul besoin réel (clore une tâche portée ailleurs) est couvert par son porteur, l'abandon de n8n (6 h) et désormais le webhook panne | **S18** : ligne `en_cours` d'un autre, `--fini 1 --forcer` → `REFUS : --forcer n'existe plus`, 0 appel à « faite », ligne toujours `en_cours`, usage noté (« TACHE 1 RENDUE » avant) | M63 (refus retiré) → S18 ; M16, M22 (garde de l'id, réécrits sans `forcer`) → S4c, S8 |
| **G** garde de config Hermes incomplète | `scripts/hooks/config-hermes.mjs` : outils n8n en LISTE BLANCHE (`get_`, `search_`, `list_` sauf `list_credentials`) ; `DENY_EXIGES` : chaque entrée de la règle (git push, git commit, vercel, appliquer-migration, presti-secrets, .env.local, file-n8n.jeton, npm run build, next build) exigée une à une. `scripts/config-hermes-e2e.mjs` gagne les cas du rapport (`call_agent`, `mutate_agent`, `revert_agent`, deny réduit à git push) et `sync_workflow`, `list_credentials`, chaque entrée de deny retirée seule. La vraie configuration de Hermes reste conforme | `garde-config-hermes.txt` : 44 vérifications vertes, 0 rouge, dont « configuration réelle de Hermes conforme » | G1 (liste noire remise) et G2 (deny réduit à git push), joués sur une copie (`mutants-g.txt`) : tués |
| **H** `revoir-notes` incomplète | Brief : section « ## Ton rôle » ; plus aucune barrière « mécanique » promise. Ligne Slack : le client envoie `executant` à « faite » (tiré du nom de la tâche), n8n écrit « Claude Code — … » ou « Hermes — … » ; l'abandon dit « File n8n — … ». Modèle de Claude Code : `claude-opus-5-5` (« verdicts → opus ») | **S19** : lignes Slack « Claude Code — revoir-notes : fait » puis « Hermes — essai-boucle : fait » ; lancement en `claude-opus-5-5` ; le brief a « ## Ton rôle ». S13a attend désormais opus | M64 (`executant` absent de « faite ») → S19 ; M36 (retour à sonnet) → S13a |

## n8n : `hermes-file-taches-v1` (`SvVxqrXdpt5sOCTL`), par le MCP n8n-oracle

- Nœuds neufs (groupe « Panne ») : `Webhook panne` (POST `hermes-tache-panne`) → empreinte SHA-256 du jeton → `Jeton valide
  (panne) ?` (même empreinte que les trois autres, sinon 401) → `Panne valide ?` (id en chiffres, motif 1 à 300 signes,
  executant hermes|claude, sinon 400) → `Lire la tâche (panne)` → 404 si inconnue → `Ligne ouverte (panne) ?` (a_faire ou
  en_cours, sinon 409) → `Bloquer la tâche (panne)` (filtre id ET statut lu : une course ne clôt rien deux fois) → `Signaler la
  panne (Slack)` (#presti-auto, « Slack account 2 » existant, `< > &` échappés, erreur Slack sans effet sur la réponse) →
  `Répondre ok (panne)` {ok, slack}.
- `Compte rendu Slack` nomme l'exécutant envoyé par le client ; `Compte rendu Slack (abandon)` dit « File n8n ».
- Configs validées (`validate_node_config` : 6 sur 6), brouillon relu (connexions, `alwaysOutputData`, identifiant), publié
  (`publish_workflow`, version active `ee42eb66-…`). Essai en direct SANS jeton (rien n'est lu ni écrit) : 401 sans jeton, 401
  avec un faux, 404 sur une route inexistante (`n8n.txt`). Le faux n8n du banc reproduit ces nœuds.

## Ce qui reste, à valider par Benj ou par l'agent principal

1. **Le code modifié est déjà celui que lance l'automatisation horaire d'Orca** (le precheck lit `scripts/` du dépôt) : le
   vrai precheck a tourné pendant le travail (`file-n8n-etat.json` rafraîchi à l'heure pile, file vide). Le webhook panne est
   publié : la chaîne est cohérente.
2. **Bloc Méthode** : `methodeSupplement` est corrigé. Je n'ai PAS lancé `node scripts/orchestre.mjs contexte` : il écrit aussi
   `../SaaS/Produit/Carte-du-code.md` (le vault, interdit ici), `CLAUDE.md`, `AGENTS.md` et `.orchestre/contexte.md` (hors
   périmètre). `CLAUDE.md` montre déjà le point 7 corrigé (régénéré pendant la session par un autre processus, pas par moi) ;
   il reste à l'agent principal à lancer `contexte` pour `AGENTS.md` et la carte.
3. **E** (hors de cette tâche : `.claude/settings.json` est interdit) : Claude Code lancé seul par Orca n'a toujours aucun refus
   mécanique de `git push`, `git commit`, `vercel`, `appliquer-migration`. À trancher avant de déposer `revoir-notes` dans la
   vraie file.
4. **J** : les fichiers de la chaîne ne sont toujours pas versionnés ; commit par l'agent principal après l'accord de Benj.
5. Le registre `lancements-taches.json` ne vit que sur ce PC ; un fichier illisible repart de zéro (noté) : au pire deux
   lancements de plus avant la panne, jamais une relance sans fin.
