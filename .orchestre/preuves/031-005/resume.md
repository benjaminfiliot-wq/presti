# 031-005 — résumé

## Fait (session Claude Code lancée par Orca, puis vérification par l'agent principal, 01/11/2026 vers 22 h 25)
- Workflow « Hermes — file des tâches » (`SvVxqrXdpt5sOCTL`) : 9 nœuds ajoutés, 3 par webhook (ajout, lecture, fin) :
  Crypto SHA256 hex « Empreinte du jeton … », IF « Jeton valide … ? », Respond to Webhook 401 `{"erreur":"jeton"}`.
  La chaîne existante est sur la branche vraie, inchangée. 28 nœuds en tout.
- Version active : `e53c107b-85d1-43c9-a40f-6b6339ac4959` (avant : `c7a7e5b0-6e03-49eb-82b1-2ccfc799d851`).
- Le jeton vit dans `%LOCALAPPDATA%\presti\file-n8n.jeton`, lisible par le seul compte de Benj et le système (héritage coupé,
  `icacls`) ; n8n ne garde que son empreinte. Le bac à sable de la session Claude ne le voit pas : c'est voulu.
- Le PC l'envoie dans l'en-tête `x-presti-jeton` (`scripts/hermes-tache-n8n.mjs`, fonction `appel`).

## Slack
Non branché : n8n Oracle n'a qu'un identifiant, « OpenAI account ». Aucun identifiant n'a été créé (interdit). Geste de Benj :
créer un identifiant Slack dans n8n Oracle (http://localhost:5679, par le tunnel), puis un nœud Slack sera ajouté à la fin d'une tâche.

## Preuve
`node scripts/hermes-tache-n8n.mjs --verifier-jeton` → code 0 : « OK : sans jeton et avec un faux, 401 sur les trois webhooks ;
avec le jeton, la file répond » (`verifier.log`). Avant le changement, le même test rendait 1 (201, 200 et 404 au lieu de 401).
