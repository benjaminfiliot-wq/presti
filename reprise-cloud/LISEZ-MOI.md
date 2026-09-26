# Reprise cloud — Presti

*Figé le 26/09/2026 à 00 h 10. Pour rafraîchir depuis le PC : `bash reprise-cloud/maj.sh` puis commit.*

Ce dossier permet à une session Claude Code **dans le cloud** (claude.ai/code) de reprendre le travail si la session du PC est à court de limite, ou si le PC est éteint.

## À lire d'abord (session cloud)

- **Benj.** C'est le fondateur de Presti. Il parle en français familier et veut des réponses courtes, prêtes à copier-coller.
  - Il ne colle jamais de SQL et n'édite rien à la main.
  - Toujours répondre en français.
- **Objectif final.** Automatisation totale de Presti : un écosystème d'agents tourne en continu, et Benj ne fait que les appels et les encaissements.
- **Mémoire.** Commencer par [memoire/MEMORY.md](memoire/MEMORY.md), puis ouvrir les fiches utiles.
  - Ce sont des copies figées. La mémoire vivante reste sur le PC de Benj.
  - Les fiches personnelles et celles des projets arrêtés (clipping, chaîne YouTube) sont exclues.
- **Docs de l'écosystème.** Dans [docs/](docs/) : interface, marketing, registre des IA, kit des sites, dropshipping, dessins gratuits.
- **Plan de production 026.** [../.orchestre/brouillons-ecosysteme/026/INDEX.md](../.orchestre/brouillons-ecosysteme/026/INDEX.md) : 203 fiches en 121 vagues.
  - L'INDEX donne les dépendances.
  - Il donne aussi la table de renumérotation ancien → nouveau.
- **Usine Oracle.** [usine/LISEZMOI.md](usine/LISEZMOI.md). Laya et Jev sont décrits dans [usine/laya-LISEZMOI.md](usine/laya-LISEZMOI.md).

## Ce que le cloud peut faire, et ce qu'il ne peut pas

**Le cloud peut :**
- lire et modifier le code du dépôt ;
- lancer typecheck, build et les juges qui n'ont besoin que du dépôt ;
- préparer des branches et des PR.

**Le cloud ne peut pas :**
- **Joindre l'usine** (88.96.53.3). La clé SSH reste sur le PC et le réseau du cloud est filtré. Donc pas de Codex, freellmapi, Laya/Jev ni Cloudflare IA depuis ici.
- **Lire `presti-secrets/`**, qui reste sur le PC. Donc pas de service_role Supabase, de Stripe, de Resend ni de token Vercel, et pas de `node scripts/deploiement-etat.mjs`.
- **Se servir du PC de Benj** : navigateur, TikTok, Instagram, Facebook, et prospection Marans. Les données des prospects ne quittent jamais le PC.
- **Appliquer une migration**, sauf si le connecteur Supabase est présent dans la session. Sinon, écrire la migration et son essai à sec, puis laisser l'application au PC. Jamais demander à Benj de coller du SQL.

**Donc :** le cloud prend les fiches `claude-code` de la 026 qui n'ont besoin ni de l'usine, ni des secrets, ni du navigateur. Le reste attend le PC.

## Règles (non négociables)

**Git et déploiement**
- Travailler sur une branche `cloud/<sujet>` et ouvrir une PR.
- La session du PC vérifie, fusionne et contrôle le déploiement : « poussé » ne veut pas dire « déployé ».

**Juges et preuves**
- Les juges sont écrits AVANT la production.
- Plusieurs juges se lancent toujours par `node scripts/juges-en-serie.mjs "juge 1" "juge 2"`, jamais par `exit $r`.
- Une preuve vide est un mensonge. Une capture livrée par un agent ne prouve rien : le juge lance, se connecte et capture lui-même.

**Sécurité**
- Jamais de création de compte ni de saisie de mot de passe, de clé ou de token.
- Jamais de suppression définitive, ni d'achat sans Benj.
- Jamais afficher ni commiter un secret.
- Pas de scraping contraire aux conditions d'utilisation.

**Publication et IA**
- Toute publication (réseaux, mails) passe par l'accord de Benj, par ligne ou par série.
- Aucune donnée de prospect dans une IA gratuite.

**Arrêts et abandons**
- CLIPFORGE est ARRÊTÉ : ne rien relancer.
- Groq a été refusé par Benj : ne pas le reproposer.

**Économie de la limite**
- Sonnet pour le mécanique, Opus seulement pour juger.
- Pas de flotte d'agents sans nécessité.

## Tableau d'avancement (26/09, 00 h)

| Chantier | État | Où |
| --- | --- | --- |
| Site Presti | En production | presti.vercel.app / prestiapp.fr |
| Vente des sites à 300 € | **Ouverte** le 25/09 (`siteCommandeVente`, commit 86ce0f3). Vercel passe en Pro au premier site vendu. | `lib/flags.ts` |
| Série 025 (025-02 à 025-23) | En production. Migrations 0093 à 0095 appliquées. | `.orchestre/fait/` |
| Usine Oracle | Prouvée, durcie, avec ses propres juges. Veille toutes les 15 min depuis le PC. | `usine/` |
| IA gratuites | freellmapi : 253 modèles (Google, Mistral, Cerebras, Cloudflare), images FLUX, voix, Whisper. Laya et Jev installés. | usine |
| Interface Claw3D pixel art | Prototype dans le Poste | `/controle/station` |
| Meta, bibliothèque de pubs | Identité en validation (erreur 2332002). Surveillance toutes les 30 min sur le PC. | `veille/` |
| Appels Marans (26/09 soir) | Liste de 120 entreprises, 25 maquettes et script prêts. Le contrôle et la notice d'appel sont à finir. | **PC seulement** |
| 14 vidéos YouTube (dropshipping) | Téléchargement refusé à l'usine (IP de datacenter). À télécharger sur le PC puis analyser sur l'usine. | `docs/Ecosysteme-Dropshipping-Sources-*` |
| Production 026 | Tour 1 raté : ordre des dépendances, puis limite de session. | INDEX 026 |
| Relecture de conformité | À reprendre | PC |

## File d'attente, par ordre

1. **PC.** Appels Marans : contrôle, puis `LISEZ-MOI-AVANT-D-APPELER.md` dans `presti-ops/prospection/2026-09-26-marans/`.
2. **PC puis usine.** Les 14 vidéos YouTube :
   - télécharger sur le PC (yt-dlp) ;
   - envoyer dans `~/veille/youtube/<id>/` sur l'usine ;
   - analyser avec les IA gratuites ;
   - écrire `Ecosysteme-Dropshipping-Strategie-2026-09-26.md`.
   - Le Skool se lit à rythme humain, par le compte de Benj.
3. **Cloud possible.** Production 026 en ordre strict de dépendances : 026-001 d'abord, puis 009, 012, 016, 018 et 048, puis la vague suivante.
   - Les fiches `codex` et les fiches « usine » restent au PC.
4. **PC.** Relecture de conformité : vidéos TikTok et Instagram, et décisions passées.
5. **Cloud en partie.** Seconde passe de la 026 :
   - marketing C01 à C16 ;
   - registre des IA ;
   - Nano Banana ;
   - Laya et Jev ;
   - kit 026-167 à 171 ;
   - skills et plugins sur l'usine ;
   - `juges-en-serie` dans tous les verifier.
6. **PC.** Vigie Meta (026-072), dès que Meta valide l'identité.

**Suivis**
- R3 `after()`, R4 ton, R5 plafond de coût IA des leads.
- Webhook Stripe asynchrone, seulement si le SEPA est activé.
- Retirer l'utilisateur `usine` du groupe docker.
- 025-10 est bloquée sur une QUESTION.
- Commiter les métadonnées de `.orchestre`.

## Démarrer une session cloud

1. Ouvrir claude.ai/code.
2. Choisir le dépôt `benjaminfiliot-wq/presti`, branche `main`.
3. Premier message : « Lis reprise-cloud/LISEZ-MOI.md et reprends la file d'attente au point 3. »

**Coût.** D'après la doc d'Anthropic, une session cloud consomme **la même limite** que le PC, puis le crédit d'usage supplémentaire une fois la limite atteinte.
- Elle ne donne pas de quota en plus.
- Elle sert à travailler sans le PC.
- Préparer ce dossier n'a presque rien coûté : ce sont des copies de fichiers.

## Point du 26/09/2026, 11 h 40 (à lire AVANT le tableau plus haut, qui date de minuit)

**Série 026 : 9 fiches faites sur 203.** L'état exact se donne par `ls .orchestre/fait | grep 026` ; ne pas se fier au chiffre recopié ici.
- Juges : 026-001, 002, 009, 012, 016, 018 et 048.
- Production par Codex sur l'usine : 026-015 et 026-019.
- En cours à 11 h 40 :
  - usine : 026-020 et 026-005 ;
  - Antigravity : 026-003 (Gemini Pro) et 026-023 (juges, Claude Opus sur le quota de Google).

**Points ouverts** : voir la fin de `.orchestre/brouillons-ecosysteme/026/INDEX.md` (026-001, 026-009, 026-012).

**Moteurs d'IA**
- **Codex** : ChatGPT (gpt-6-sol) en premier. Sur un 401, Ollama Cloud prend le relais (`gpt-oss:120b-cloud`, gratuit), puis freellmapi.
- **Ollama** : v0.34.4 sur l'usine. Modèles locaux qwen3 4B et 8B, plus 4 modèles Cloud gratuits : gpt-oss 120B et 20B, gemma4, nemotron-3-super.
- **Laya/Jev** : un modèle de décision local (qualifier, vérifier les chiffres, router). Il ne rédige pas.
- **Antigravity** : il prend les fiches du PC et les fiches de juges (Opus).
- Le détail est dans `docs/Ecosysteme-IA-Registre-2026-09-25.md`, section 6.

**Limite Claude**
- Hebdomadaire, tous modèles : 94 % à 11 h. Elle repart à zéro le 27/09 à 8 h (heure de Paris). « Crédit supplémentaire » est désactivé sur le compte.
- Une session cloud consomme la MÊME limite. À 100 %, elle s'arrête aussi, sauf si Benj active le crédit supplémentaire dans ses réglages claude.ai, et alors elle puise dans ses 250 €.
- **En cas de coupure**, le travail continue sans Claude :
  - Codex et Ollama sur l'usine (lanceurs `~/veille/lancer-codex-*.sh`, fiches `node scripts/usine.mjs lancer/recuperer`) ;
  - Antigravity sur le PC.

**Chantiers de l'usine**, avec leurs juges écrits d'avance :
- `~/veille/lancer-codex-yt.sh` : les 14 vidéos YouTube de dropshipping, juge `juges/juge-yt.mjs` ;
- `~/veille/lancer-codex-conformite.sh` : la conformité des vidéos TikTok/Instagram face aux décisions, juge `juges/juge-conformite.mjs`.
- Journaux : `~/veille/journal-codex-*.log`.

**Oracle** : l'usine est passée à 4 OCPU / 24 Go le 26/09, alors que l'offre Always Free est à 2/12 depuis le 15/06/2026. Benj dit que ça tient. Si l'instance s'arrête, la remettre à 2/12.
