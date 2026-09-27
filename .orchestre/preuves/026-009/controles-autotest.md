# 026-009 — autotest du catalogue de la preuve horloge-bus

Écrit par `node scripts/juges-026-horloge-bus-preuve.mjs --autotest` le 2026-09-27T06:44:33.375Z. Chaque contrôle que `preuve-NN.json` peut déclarer est éprouvé sur ses témoins (`scripts/fixtures/026-horloge-bus/temoins/`) et ses sabotages : il doit accepter le témoin et prendre chaque sabotage. Le plancher des cahiers est éprouvé sur des `preuve-NN.json` affaiblis.

- **AT-echec-sur-reference** PASS — lecture des sorties : 6 sorties plantées refusées (dont le critère PASS à tort cité par d'autres), la conforme acceptée
- **AT-temoin** PASS — code ≠ 0, bilan FAIL ou absent, délai : refusés ; code 0 + bilan PASS : accepté
- **AT-reel-sans-secret** PASS — fetch coupé dans l'enfant ; canari affiché vu, sortie propre acceptée
- **AT-bloc-essai** PASS — défauts plantés vus par les deux lectures (commit hors chaîne, rollback hors chaîne, grant hors chaîne, drop schema hors chaîne, vault. hors chaîne, second énoncé, raise ôté) ; mots interdits dans une chaîne acceptés ; decrypted_secret permis dans exists (…) seulement ; blocEssai refuse : jumeau porteur de $essai_026$, jumeau porteur de $migration_026$, scénario porteur de $essai_026$
- **AT-reutilise** PASS — import ôté, redéfinition, texte ou code recopié, jamais appelé : refusés ; conforme accepté
- **AT-compte-rendu** PASS — un lecteur qui accepte tout et un lecteur qui refuse tout sont pris
- **AT-contrat-fiches** PASS — paramètre renommé, fonction fantôme, colonne réécrite, code d'erreur inventé, clé d'essai ôtée : vus
- **AT-faux-postgrest** PASS — témoin accepté (ops_tache_creer conforme → 200, p_agent → agent → 400) ; sabotages pris : laxiste, ferme, muet, immortel
- **AT-reseau-piege** PASS — fetch, http.request et net.connect vers un hôte refusé notés et bloqués, en permis comme en interdits ; 127.0.0.1 laissé passer
- **AT-horloge-simulee** PASS — témoin accepté (2026-10-24T05:30:00Z → 07:30, 2026-10-25T06:30:00Z → 07:30) ; sabotages pris : figer, avancer, decale, fuseau
- **AT-motifs** PASS — motif interdit présent, compte hors bornes, fichier vide, aucun fichier : refusés ; conforme accepté
- **AT-immobile** PASS — fichier apparu, modifié ou rétabli : vu ; états égaux : acceptés
- **AT-plancher** PASS — preuve-01.json et un lot 03 conforme acceptés ; affaiblissements pris : JP-3 ôté du lot 03 (JP-3), faux-postgrest sur une autre fonction (JP-3), faux-postgrest sans renommer p_agent (JP-3), réseau ouvert à tous (JP-4), critère attendu changé (JP-1), autre référence (JP-1), autre fiche (JP-1), reel-sans-secret ôté du lot 01 (JP-2), bloc-essai du lot 01 sans 0098 (JP-3)
- **AT-piege-juges** PASS — par le chemin des lots (NODE_OPTIONS, deux passages) : le juge sage passe, le juge qui appelle piege-026.invalid est pris
- **AT-immobile-reel** PASS — rien n'a bougé hors .orchestre/travail/ et .orchestre/preuves/ (1329 fichier(s) suivis par empreinte)

## Un lot 03 conforme (026-038 peut le déclarer ainsi)

```json
{
  "lot": "03",
  "fiche": "026-038",
  "reference": "<la référence de preuve-01.json>",
  "absents_de_la_reference": [
    "lib/agents/garde.ts"
  ],
  "archive": [
    "supabase",
    "lib",
    "app",
    "scripts"
  ],
  "juges": "<agents-garde-qa AG-1, agents-routes-qa AR-1, pause-qa PA-1>",
  "criteres": {
    "JP-1": [
      {
        "type": "echec-sur-reference"
      }
    ],
    "JP-2": [
      {
        "type": "temoin"
      }
    ],
    "JP-3": [
      {
        "type": "faux-postgrest",
        "module": "scripts/lib/faux-postgrest.mjs",
        "fonction": "ops_tache_creer",
        "renommer": {
          "p_agent": "agent"
        }
      }
    ],
    "JP-4": [
      {
        "type": "reseau-piege",
        "permis": [
          "127.0.0.1",
          "localhost",
          "::1"
        ]
      }
    ],
    "JP-5": [
      {
        "type": "immobile"
      }
    ]
  }
}
```
