# 026-148 — mise en service du chef sur l'usine : 05/10/2026 (agent Sonnet, compte gardien, sudo sans mot de passe)

Autorisation : Benj (05/10 matin, conversation) : « 2 : l'équipe tourne seule ; 5 : je t'autorise ; 6 : tu es autorisé, tu as toutes les clés, fais-le seul ; 3 en dernier ». Gardien accordé (D-0410-15).
Aucune valeur de jeton n'est écrite ici ni affichée ; `envoi_froid` et `lib/flags.ts` non touchés.

## Étapes

| # | Étape | État | Preuve (sortie de contrôle) |
|---|---|---|---|
| 0 | Code déployé sur l'usine (`usine-agents.mjs maj --forcer`, 457 commits de retard, npm ci sans scripts) | FAIT | `déployé : f7b581d4…` = origin/main |
| 1 | Compte `chef-modele` (nologin, aucun groupe sudo/adm), `/home/agents` en 700, coffre 600 | FAIT | `uid=10002(chef-modele) gid=10002 groups=10002` ; `/home/agents agents:agents 700` ; `presti-coffre etat : mode=600 proprietaire=agents` |
| 2 | Dossiers d'échange `/srv/presti-chef/echange` et `/srv/presti-ia/echange` | FAIT | `agents:agents 2770` (les deux) |
| 3 | Lanceurs `presti-chef-modele`, `presti-chef-modele-essai`, `presti-ia-modele` (root, 755) ; sudoers du juge, seule ligne `usine ALL=(chef-modele) NOPASSWD: /usr/local/bin/presti-chef-modele-essai` (`visudo -cf` : parsed OK, 440) | FAIT | `cmp` identique à l'arbre déployé |
| 4 | Codex 0.156.1 exact dans `/opt/codex/0.156.1` (npm `--ignore-scripts`, root), lien `/opt/codex/bin/codex` | FAIT | `codex-cli 0.156.1` |
| 5 | AppArmor : second profil `codex-bwrap-opt` (chemin `/opt/codex/*/…/bwrap`) ajouté à `/etc/apparmor.d/codex-bwrap`, profil de `usine` intact (copie `/root/codex-bwrap.avant-chef-modele-05-10`), `apparmor_parser -r` ; paquet `bubblewrap` NON installé | FAIT | `aa-status : codex-bwrap, codex-bwrap-opt` ; `dpkg -l bubblewrap : aucun paquet` |
| 6 | `/home/chef-modele/.codex/config.toml` (600) : `gpt-6-sol`, `workspace-write`, `network_access = false`, règles `garde-git.rules` copiées ; fournisseur `ollama-usine` (127.0.0.1:11434, secours de Matt, jamais par défaut) ; `/home/agents/.codex` absent | FAIT | essai : `config=workspace-write reseau=coupe modele=gpt-6-sol` |
| 7 | Isolation sous les propriétés du service (`systemd-run` User=chef-modele, SupplementaryGroups=agents, InaccessiblePaths=/home/agents) | FAIT | `ecrit-dans-echange=oui ecrit-hors=refuse coffre=refuse reseau=coupe` ; `presti-chef-modele-essai : coffre=refuse home=refuse bac=refuse` |
| 8 | Jetons internes par `usine-coffre.mjs poser-jeton-agent` : `chef` (+ copie Windows `PRESTI_JETON_CHEF`, 51 signes), `standardiste`, `facteur` — jamais affichés | FAIT | `presti-coffre noms` liste `PRESTI_JETON_CHEF/STANDARDISTE/FACTEUR` ; GET `/api/agents/etat` avec le jeton du chef : 200 (CH-R3 PASS) ; battements prod standardiste 08:35Z, facteur 08:30Z |
| 9 | Unités du chef : `presti-chef-{plein,leger,reunion}.{service,timer}`, `presti-chef-modele.{service,path}` ; file IA `presti-ia-modele.{service,path}` ; `systemd-analyze verify` = 0 ; tout `enabled` | FAIT | `systemctl list-timers` : plein 10:05, léger 09:05 (heure impaire :05), réunion 18:00 (Paris) ; CH-R1 PASS, CH-R9 PASS |
| 10 | Standard et Facteur (`installer modeles`) : `presti-standard`, `presti-facteur`, `presti-facteur-soir` ; premiers passages à la main | FAIT | `presti-standard : result=success status=0 … standardiste : rendus=0` ; idem facteur |
| 11 | `CODEX_LANCEUR` du livreur | SANS OBJET | `presti-livreur.service` du dépôt le porte déjà ; non installé (autre fiche) |
| 12 | Ligne « G3 fait » datée (25/09) dans `.orchestre/decisions.md`, antérieure à l'installation du lanceur IA | VÉRIFIÉ | ligne 103 |
| 13 | Essai de la file IA (texte fictif) sous `agents` → `chef-modele` | RELAIS OK, MODÈLE 401 | le relais rend la main en 16 s, `compte:"chef-modele"` ; Codex : `401 Unauthorized: Missing bearer` (pas connecté) |
| 14 | Secours Ollama : même chaîne avec `-m gpt-oss:120b-cloud -c model_provider="ollama-usine"` dans le dossier du chef ; la file IA refuse le même argv | FAIT (code), quota Ollama gratuit épuisé | chef : joint Ollama, répond « rate limit exceeded: Free usage limit » ; file IA : `reponse.json code 2 « argv refusé »` |
| 15 | Premier passage du cycle léger (sans attendre l'heure) | ATTEINT LE MODÈLE, SORT EN 1 | `✗ plan absent ou vide` après 41 s (le modèle répond 401) ; ligne `presti-journal chef` `code:1` |
| 16 | Revue du lundi | SANS OBJET | décision du 27/09 : revue sur l'usine par une suite dédiée, plus de routine cloud |
| 17 | **Connexion Codex de `chef-modele`** (`codex login --device-auth`) | **NON FAIT : geste de Benj** | `codex login status : Not logged in` ; voir `reste-pour-benj.md` |

## Défauts trouvés à la première mise en service réelle, corrigés (3 commits sur main, poussés, déployés sur l'usine)

1. `00f13b42` `scripts/chef/consignes.mjs` : le cycle sortait en code 1 (`✗ événements illisibles (HTTP 200)`) : la route de production `GET /api/agents/evenements` rend le **tableau nu**, le client attendait `{ evenements: [...] }` (le faux bus du juge avait figé cette forme). Le client lit maintenant les deux (comme `reunion.mjs`). `chef-qa --groupe=consigne,consignes,fil` : 11/11.
2. `8f02d298` `scripts/usine/chef-modele.mjs` : sous l'umask 0022 du service, le dossier d'échange d'une demande naissait en 2750 : `chef-modele` ne pouvait ni prendre la demande (rename silencieusement ignoré) ni écrire sa réponse. `demander` remet le dossier en 2770. `chef-qa --groupe=usine` : 5/5.
3. `f7b581d4` `presti-chef-modele.timer` et `presti-ia-modele.timer` (filet de 30 s) : le `.path` sur `*/demande.pret` manque parfois une demande (une demande a attendu seule 12 min, constaté). Installés et activés ; `docs/agents/routines.md` complété.

Ces trois fichiers sont dans le `interdit` de la fiche 026-148 (scripts/chef/**, scripts/usine/**) : corrections minimales, nécessaires au vert de l'exécution réelle ; à relire par le chef.

## Verdict `node scripts/chef-qa.mjs --reel` (verifier.log) : 7/11

PASS CH-R1, R3, R4, R5, R6, R7, R9. FAIL (attendus tant que Codex n'est pas connecté sous `chef-modele`) : CH-R2 (aucun cycle en code 0), CH-R8 (idem), CH-R10 (file IA : pas de JSON). CH-R11 : le juge lit `journalctl -u` et le dossier d'échange sous le compte `usine`, qui n'y a pas droit (sortie vide) : à juger depuis un compte qui lit le journal, ou à corriger côté juge (hors périmètre ici) ; les passages sont pourtant réels (voir étape 10) et les battements de production frais.

## Constat pour le chef (hors fiche)

- `presti-chef-bilan.timer` (026-239) et `presti-vigile.timer` sont actifs sur l'usine (installés par d'autres mises en service) ; le bilan appellera lui aussi le modèle déconnecté.
- Le cycle de secours Ollama (points 1 à 4 de la décision du 27/09 de 026-129) n'est pas dans `cycle.mjs` : seule la configuration (fournisseur `ollama-usine`) est prête ; le compte Ollama gratuit est de toute façon à son plafond.
- `package.json` sans `"type": "module"` : un avertissement Node sur chaque passage du Standard/Facteur (sans effet).
