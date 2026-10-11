# Audit du choix des moteurs d'IA par les agents — 05/10/2026 (avant le relais)

Lecture du code (`lib/agents/moteurs.ts`, `llm.ts`, `scripts/agents/passes-modele.mjs`, `scripts/usine/chef-modele.mjs`, `scripts/chef/cycle.mjs`,
unités `scripts/usine/systemd/`) et constats RÉELS sur l'usine le 05/10 matin (sonde `curl`, `codex exec` par la file, `systemctl`, `journalctl`).

## Ce que vaut chaque moteur ce matin (mesuré sur l'usine)

| Moteur | Constat | Mesure |
|---|---|---|
| Codex (file IA, compte `chef-modele`) | **401 « Missing bearer »** : le compte n'est pas connecté (pas d'`auth.json`) ; en plus quota ChatGPT jusqu'au 9/10 21 h 15 | échec franc en 16 s (5 reconnexions) |
| freellmapi 127.0.0.1:3001 | répond **avec clé** (`~usine/.config/presti/freellmapi.key`) ; **sans clé : 401** | `auto` : 0,1 à 3 s ; `gemini-3-flash-preview` : 429 (limite) ; `ministral-14b` : OK |
| Ollama Cloud (`gpt-oss:120b-cloud`) | **429 « You reached the Free usage limit »** (limite mensuelle) | 0,3 s |
| Ollama local 4B (`qwen3:4b-instruct`) | OK, chaud : 0,2 s ; 1,7 s pour un classement | rechargement ~60-120 s après un 8B |
| Ollama local 8B (`qwen3:8b`) | OK mais **modèle à réflexion** : 20 jetons épuisés sans réponse ; `reasoning_effort: none` le règle | 106-140 s à froid |
| Codex agentique (chef) sur freellmapi `auto` | **plan du cycle léger produit en 50 s** (essai réel, fournisseur `fl`, `wire_api=responses`) | OK |
| Codex agentique (chef) sur Ollama local 4B | pas de plan en 700 s (prompt de Codex trop lourd pour 4 cœurs ARM) | échec |

## Tableau agent → moteur voulu → repli existant → verdict

| Agent | Moteur voulu (MOTEUR_DE) | Repli existant | Verdict avant | Après le relais |
|---|---|---|---|---|
| chef | Codex `gpt-6-sol`/`luna` via `chef-modele` (`codex exec`) | **aucun** : `cycle.mjs` saute le cycle sur quota ; sur 401 : « plan absent ou vide » (cycle léger et plein en échec depuis ce matin) | **s'arrête** | relais du chef : freellmapi `auto` → gemini → ministral → Ollama Cloud → local 8B → 4B (prospect : local seulement) |
| standardiste | Codex (file IA), données de prospect | REPLI `codex → laya → ollama_local` : `OLLAMA_URL` et le « oui » daté **absents des unités** ; `avec-coffre` ne passait pas ces variables | **s'arrête** (le passage dure 4 min puis `rendus=0`) | Codex → local 4B→8B après le « oui » daté ; attente propre sinon |
| facteur (second juge) | Codex `gpt-6-luna`, prospect | `codex → laya` (Laya n'est pas exécutable) ; second juge étalonné sur `codex:gpt-6-luna` seul | **s'arrête** (voulu : sans Codex, rien ne part) | inchangé, formalisé : aucun repli (`SANS_REPLI`) |
| redacteur_site | Codex `gpt-6-sol`, prospect | `codex → ollama_local` ; **mais `commande-rediger.mjs` cherchait `lecteur.appel`, qui n'existe pas** : le lecteur n'a jamais été branché | **mauvais branchement** (toujours « sans IA ») | branché sur le relais (adaptateur `{systeme, utilisateur}`) |
| veille_pubs | Codex, prospect | `codex → ollama_local` | **sans appelant** (aucun script ne l'utilise) | prêt dans le relais, rien à brancher |
| studio | Codex `gpt-6-sol`, public | `codex → ollama_local` (`OLLAMA_URL` absent de l'unité) ; jamais freellmapi | **s'arrête** | Codex → freellmapi (si clé) → Ollama Cloud → local 8B→4B |
| douleurs | freellmapi `auto`, public | `freellmapi → ollama_local → codex` ; **`creerLecteur` n'envoyait aucune clé à freellmapi (401 certain)** ; unité non installée (`PRESTI_JETON_DOULEURS` hors de la liste du coffre) | **mauvais repli** (jamais servi) | clé envoyée ; freellmapi → Codex → cloud → local |
| vigile, sav, tresorier (comptable), qualite_sites | aucune entrée `MOTEUR_DE` : gabarit déterministe | sans objet | **ok** (sans IA, ne s'arrête pas) | inchangé |
| contenu | Laya (local, `vraisemblance`) | sans objet | **ok** | inchangé |
| recenseur, vigie_meta, juge_faits, redacteur (Plume), garde, repondeur, atelier_maquettes, livreur, livreur_usine, facteur_usine (porteur), crieur, experience, a0, systeme, usine (surveillant), pont, pont_telegram | aucun appel de modèle de langage (lecture : ni `creerLecteur`, ni `MOTEUR_DE`, ni `codex exec`) | sans objet | **ok** (sans IA) | inchangé |
| entraide (`demanderConseil`), étalonnage | freellmapi (public), corpus d'essai | `freellmapi` sans clé : **401** | **mauvais repli** | clé envoyée (`FL_KEY`) |

Remarques de fond relevées à la lecture :

1. `appelerCodex` cherchait « usage limit » et « 401 » sur la **sortie d'erreur** du lanceur ; or `presti-ia-modele` rend la sortie de Codex sur
   la **sortie standard** : un quota ou un 401 passait pour une panne anonyme (corrigé : sortie standard lue quand le code est ≠ 0).
2. La mémoire d'un moteur à bout était **en mémoire du processus** : chaque passage (processus neuf) retentait Codex (16 s perdues) — corrigé :
   fichier d'état partagé.
3. Les unités des agents de prospects ne donnaient ni `OLLAMA_URL` ni le « oui » daté ; `avec-coffre.mjs` ne les laissait pas passer.
4. Pour les prospects, le local reste sous le « oui » daté de Benj (`IA_LOCALE_PROSPECTS_OUI`), qui n'est posé nulle part à ce jour : le relais
   respecte ce garde-fou existant et ne le lève pas.
